# MDC-admin-frontend

The Ten Sparrows Micro-Datacenter (MDC) is a scalable on-premise Virtual Private Cloud based on Edge-Compute principles and optimized for economic feasibility, operating within hostile environments, and multi-tenant software application hosting. This project is the frontend applicaiton used to manage users, workspaces, and other global settings.

## **🔐 SSH Setup**

### **1. Generate an RSA SHA‑2 Key**

Azure DevOps requires RSA keys using SHA‑2 signatures.

```bash
ssh-keygen -t rsa-sha2-512 -b 4096 -f ~/.ssh/tensparrows
```

This creates:

- `~/.ssh/tensparrows` (private key)
- `~/.ssh/tensparrows.pub` (public key)

---

### **2. Add the Key to Your SSH Agent**

```bash
ssh-add ~/.ssh/tensparrows
```

Verify it loaded:

```bash
ssh-add -l
```

---

### **3. Upload the Public Key to Azure DevOps**

1. Go to **User Settings** → **SSH Public Keys**
2. Click **Add**
3. Paste the contents of:

```
~/.ssh/tensparrows.pub
```

---

### **4. Configure SSH for Azure DevOps**

Create or edit:

```
~/.ssh/config
```

Add:

```
Host ssh.dev.azure.com
    HostName ssh.dev.azure.com
    User git
    IdentityFile ~/.ssh/tensparrows
    IdentitiesOnly yes
    PubkeyAcceptedAlgorithms rsa-sha2-256,rsa-sha2-512
    HostkeyAlgorithms rsa-sha2-256,rsa-sha2-512
```

This forces SSH to use the correct key and algorithms.

> Even though Azure provides an easy-to-use URI copy for SSH, it's incorrect. Git uses `git@` instead of `tensparrows@` to authenticate. Also the URL `vs-ssh.visualstudio.com` is deprecated. The updated URL is `ssh.dev.azure.com`. The old URL still works, but at some point it will be phased out.

---

### **5. Tell Git to Use This SSH Config**

Git on Windows uses its own SSH unless overridden.

```bash
git config --global core.sshCommand "ssh -F ~/.ssh/config"
```

---

### **6. Test the Connection**

```bash
ssh -T git@ssh.dev.azure.com
```
