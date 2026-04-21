using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;

namespace MDC.Core.Services.Providers.PVEClient;

internal class VNCRelay : IVNCRelay
{
    public async Task HandleSessionAsync(WebSocket browserSocket, VNCSession vncSession, CancellationToken cancellationToken = default)
    {
        // Implementation of the VNC relay session handling
        // This would include reading from the browser WebSocket, forwarding data to the VNC session,
        // and sending responses back to the browser WebSocket.

        await vncSession.ClientWebSocket.ConnectAsync(new Uri(vncSession.Url), cancellationToken);

        await InitializeAsync(vncSession, browserSocket, cancellationToken);

        await RelayTrafficAsync(browserSocket, vncSession.ClientWebSocket, cancellationToken);
    }

    private async Task InitializeAsync(VNCSession vncSession, WebSocket browserSocket, CancellationToken cancellationToken)
    {
        // See RFB Protocol Version 3.8 for handshake details: https://datatracker.ietf.org/doc/html/rfc6143

        var proxmoxSocket = vncSession.ClientWebSocket;

        // --- Relay ProtocolVersion Handshake ---
        {
            var pveVersion = await ReadBytesAsync(proxmoxSocket, 12, cancellationToken);
            var pveVersionStr = Encoding.ASCII.GetString(pveVersion);
            // Forward server version to browser
            await SendBytesAsync(browserSocket, pveVersion, cancellationToken);

            var browserVersion = await ReadBytesAsync(browserSocket, 12, cancellationToken);
            var browserVersionStr = Encoding.ASCII.GetString(browserVersion);
            // Forward browser version to server
            await SendBytesAsync(proxmoxSocket, browserVersion, cancellationToken);

            if (pveVersionStr != browserVersionStr)
                throw new Exception($"RFB protocol mismatch: Server='{pveVersion}', Browser='{browserVersionStr}'");
        }

        // --- Relay Security Handshake ---
        {
            // Read security types from server
            var secCountBytes = await ReadBytesAsync(proxmoxSocket, 1, cancellationToken);
            int secTypeCount = secCountBytes[0];
            if (secTypeCount == 0)
            {
                // If there are no security types, the server will send a reason string. Read and include it in the error message.
                var reasonStr = await GetSecurityReasonAsync(proxmoxSocket, browserSocket, cancellationToken);
                throw new Exception($"VNC server returned no security types. Reason: {reasonStr}");
            }
            var secTypes = await ReadBytesAsync(proxmoxSocket, secTypeCount, cancellationToken);

            if (!secTypes.Contains((byte)2))
                throw new Exception("VNC authentication type (2) not supported by server");

            // Choose VNC auth (type 2) 
            await SendBytesAsync(proxmoxSocket, new byte[] { 2 }, cancellationToken);

            ////// Forward security types to browser
            ////await SendBytesAsync(browserSocket, secCountBytes, cancellationToken);
            ////await SendBytesAsync(browserSocket, secTypes, cancellationToken);

            //// Override seciruty: Publish only authentication type 1 (none) to browser, regardless of what the server supports, since we are handling the security
            //await SendBytesAsync(browserSocket, new byte[] { 1, 1 }, cancellationToken);

            //// Read chosen security type from browser
            //var chosenSecType = await ReadBytesAsync(browserSocket, 1, cancellationToken);
            ////if (chosenSecType.Length != 1 || chosenSecType[0] != 2)
            ////    throw new Exception($"Browser chose unsupported security type: {chosenSecType[0]}");
            //if (chosenSecType.Length != 1 || chosenSecType[0] != 0)
            //    throw new Exception($"Browser chose unsupported security type: {chosenSecType[0]}");
            ////// Forward chosen security type to server
            ////await SendBytesAsync(proxmoxSocket, chosenSecType, cancellationToken);
        }

        // --- Handle authentication ---
        {
            // --- Receive challenge ---
            var challenge = await ReadBytesAsync(proxmoxSocket, 16, cancellationToken);

            if (challenge.Length != 16)
                throw new Exception("Invalid VNC challenge length");

            // --- Encrypt challenge ---
            var response = EncryptVncChallenge(challenge, vncSession.Password ?? string.Empty);

            // --- Send encrypted response ---
            await SendBytesAsync(proxmoxSocket, response, cancellationToken);
        }

        // Override security with browser security negotiation
        {
            // Publish only authentication type 1 (none) to browser, regardless of what the server supports, since we are handling the security
            await SendBytesAsync(browserSocket, new byte[] { 1, 1 }, cancellationToken);

            // Read chosen security type from browser
            var chosenSecType = await ReadBytesAsync(browserSocket, 1, cancellationToken);

            if (chosenSecType.Length != 1 || chosenSecType[0] != 1)
                throw new Exception($"Browser chose unsupported security type: {chosenSecType[0]}");
        }

        // --- Read authentication result and handle failure ---
        {
            // --- Read auth result ---
            var result = await ReadBytesAsync(proxmoxSocket, 4, cancellationToken);

            if (result.Length != 4)
                throw new Exception("Invalid auth result length");

            // --- Forward auth result to browser ---
            await SendBytesAsync(browserSocket, result, cancellationToken);

            int status = BitConverter.ToInt32(result.Reverse().ToArray(), 0);

            if (status != 0)
            {
                // If authentication failed, the server may send a reason string. Read and include it in the error message.
                var reasonStr = await GetSecurityReasonAsync(proxmoxSocket, browserSocket, cancellationToken);
                throw new Exception($"VNC Authentication failed with status {status}. Reason: {reasonStr}");
            }
        }
    }

    private async Task<string> GetSecurityReasonAsync(ClientWebSocket socket, WebSocket forwardSocket, CancellationToken cancellationToken)
    {
        var reasonLengthBytes = await ReadBytesAsync(socket, 4, cancellationToken);
        int reasonLength = BitConverter.ToInt32(reasonLengthBytes.Reverse().ToArray(), 0);
        var reasonBytes = await ReadBytesAsync(socket, reasonLength, cancellationToken);

        // Forward reason to forwardSocket
        await SendBytesAsync(forwardSocket, reasonLengthBytes, cancellationToken);
        await SendBytesAsync(forwardSocket, reasonBytes, cancellationToken);

        return Encoding.ASCII.GetString(reasonBytes);
    }

    private async Task RelayTrafficAsync(WebSocket browser, ClientWebSocket proxmox, CancellationToken cancellationToken)
    {
        int bufferSize = 1024 * 4;
        var bufferA = new byte[bufferSize];
        var bufferB = new byte[bufferSize];

        var browserToProxmox = Task.Run(async () =>
        {
            while (!cancellationToken.IsCancellationRequested &&
                       browser.State == WebSocketState.Open &&
                       proxmox.State == WebSocketState.Open)
            {
                var result = await browser.ReceiveAsync(bufferA, cancellationToken).ConfigureAwait(false);  // Use ConfigureAwait(false) to improve performance

                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                await proxmox.SendAsync(
                    bufferA.AsMemory(0, result.Count),
                    WebSocketMessageType.Binary,
                    result.EndOfMessage,
                    cancellationToken).ConfigureAwait(false);   // Use ConfigureAwait(false) to improve performance
            }
        });

        var proxmoxToBrowser = Task.Run(async () =>
        {
            while (!cancellationToken.IsCancellationRequested &&
                       browser.State == WebSocketState.Open &&
                       proxmox.State == WebSocketState.Open)
            {
                var result = await proxmox.ReceiveAsync(bufferB, cancellationToken).ConfigureAwait(false);  // Use ConfigureAwait(false) to improve performance

                await browser.SendAsync(
                    bufferB.AsMemory(0, result.Count),
                    WebSocketMessageType.Binary,
                    result.EndOfMessage,
                    cancellationToken).ConfigureAwait(false);   // Use ConfigureAwait(false) to improve performance
            }
        });

        await Task.WhenAny(browserToProxmox, proxmoxToBrowser);
    }

    private async Task<byte[]> ReadBytesAsync(WebSocket socket, int count, CancellationToken cancellationToken)
    {
        var buffer = new byte[count];
        int received = 0;

        while (received < count)
        {
            var result = await socket.ReceiveAsync(
                buffer.AsMemory(received, count - received),
                cancellationToken);

            if (result.MessageType == WebSocketMessageType.Close)
                throw new Exception("WebSocket closed unexpectedly during read");

            if (result.Count == 0)
                throw new Exception("Received zero bytes from socket");

            received += result.Count;
        }

        return buffer;
    }

    private async Task SendBytesAsync(WebSocket socket, byte[] data, CancellationToken cancellationToken)
    {
        await socket.SendAsync(
            data,
            WebSocketMessageType.Binary,
            true,
            cancellationToken);
    }

    private byte[] EncryptVncChallenge(byte[] challenge, string password)
    {
        var key = new byte[8];

        var pwdBytes = Encoding.ASCII.GetBytes(password);
        Array.Copy(pwdBytes, key, Math.Min(8, pwdBytes.Length));

        // Reverse bits in each byte (VNC requirement)
        for (int i = 0; i < 8; i++)
        {
            key[i] = ReverseBits(key[i]);
        }

        // Fix DES parity bits
        SetOddParity(key);

        // If it's a blocked weak key, modify slightly
        if (DES.IsWeakKey(key) || DES.IsSemiWeakKey(key))
        {
            key[7] ^= 0xF0;
        }

        using var des = DES.Create();

        des.Mode = CipherMode.ECB;
        des.Padding = PaddingMode.None;

        des.Key = key;

        using var encryptor = des.CreateEncryptor();

        return encryptor.TransformFinalBlock(challenge, 0, challenge.Length);
    }

    private void SetOddParity(byte[] key)
    {
        for (int i = 0; i < key.Length; i++)
        {
            byte b = key[i];

            bool needsParity = (((b >> 7) ^ (b >> 6) ^ (b >> 5) ^ (b >> 4) ^
                                 (b >> 3) ^ (b >> 2) ^ (b >> 1)) & 1) == 0;

            if (needsParity)
            {
                key[i] ^= 1;
            }
        }
    }


    private byte ReverseBits(byte b)
    {
        byte r = 0;
        for (int i = 0; i < 8; i++)
        {
            r <<= 1;
            r |= (byte)(b & 1);
            b >>= 1;
        }
        return r;
    }
}
