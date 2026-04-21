using Microsoft.OData.Edm;
using Microsoft.OData.ModelBuilder;
using Microsoft.OData.ModelBuilder.Core.V1;
using System;
using System.Text.Json.Nodes;

namespace MDC.Api
{
    internal class EdmModelBuilder
    {
        // Learn more about OData Model Builder: https://learn.microsoft.com/odata/webapi/model-builder-abstract
        public static IEdmModel GetEdmModel()
        {
            var builder = new ODataConventionModelBuilder();
            builder.EnableLowerCamelCase();
            builder.Namespace = "MDC.Shared.Models";

            // Workspaces
            {
                builder.EntitySet<Workspace>("Workspaces").EntityType
                    .HasKey(i => i.Id)
                    .Expand();

                builder.EntitySet<Workspace>("Workspaces").EntityType
                    .CollectionProperty(w => w.VirtualMachines)
                    .IsNullable();
                builder.EntitySet<Workspace>("Workspaces").EntityType
                    .CollectionProperty(w => w.VirtualNetworks).AutoExpand = true;

                builder.EntitySet<Workspace>("Workspaces").EntityType
                    .Function("Descriptor").Returns<WorkspaceDescriptor>();

                var updateDescriptorAction = builder.EntityType<Workspace>().Action("WorkspaceDescriptor");
                // updateDescriptorAction.Parameter<JsonNode>("workspaceDescriptor").Required();
                updateDescriptorAction.Returns<WorkspaceDescriptor>();

                builder.EntityType<Workspace>().Action("Lock");

                builder.EntityType<Workspace>().Action("Command");
            }

            // Organizations
            {
                builder.EntitySet<Organization>("Organizations").EntityType
                    .HasKey(i => i.Id);

                builder.EntitySet<Organization>("Organizations").EntityType
                    .CollectionProperty(i => i.OrganizationUserRoles).AutoExpand = true;
            }



            //builder.EntityType<SiteNode>()
            //    .HasKey(i => i.Name)
            //    .Expand(SelectExpandType.Automatic);

            // Sites
            {
                builder.EntitySet<Site>("Sites").EntityType
                    .HasKey(i => i.Id);

                // AutoExpand child collection properties
                builder.EntitySet<Site>("Sites").EntityType
                    .CollectionProperty(site => site.SiteNodes)
                    .AutoExpand = true;
                builder.EntitySet<Site>("Sites").EntityType
                    .CollectionProperty(site => site.GatewayTemplates).AutoExpand = true;
                builder.EntitySet<Site>("Sites").EntityType
                    .CollectionProperty(site => site.VirtualMachineTemplates).AutoExpand = true;

                //builder.EntitySet<Site>("Sites").EntityType
                //    .HasMany(p => p.Workspaces).AutoExpand = true;
                //builder.EntitySet<Site>("Sites").EntityType
                //    .HasMany(p => p.Organizations).AutoExpand = true;

                builder.EntitySet<Site>("Sites").EntityType
                    .Function("DownloadableTemplates")
                    .Returns<DownloadableTemplate[]>();
                builder.EntitySet<Site>("Sites").EntityType
                    .Action("DownloadTemplate")
                    .Parameter<DownloadTemplateDescriptor>("downloadTemplateDescriptor").Required();
                // builder.EntitySet<Site>("Sites").EntityType.HasMany(s => s.Workspaces);
                builder.EntitySet<Site>("Sites").EntityType
                    .Action("RemoveNode")
                    .Parameter<SiteNodeRemoveDescriptor>("descriptor").Required();
            }

            // SiteNodes
            //{
            //    builder.Entit
            //}

            builder.EntitySet<User>("Users").EntityType
                .HasKey(i => i.Id);

            builder.EntitySet<AppRole>("AppRoles").EntityType
                .HasKey(i => i.Value);

            builder.EntitySet<RemoteNetwork>("RemoteNetworks").EntityType
                .HasKey(i => i.Id);
            builder.EntitySet<RemoteNetwork>("RemoteNetworks").EntityType
                .CollectionProperty<RemoteNetworkMember>(i => i.Members);

            builder.EntitySet<SiteNodeRegistration>("SiteNodeRegistrations").EntityType
                .HasKey(i => i.Id);

            builder.EntitySet<ActivityLog>("ActivityLogs").EntityType
                .HasKey(i => i.Id);

            //builder.EntitySet<Site>("Sites").EntityType
            //    .Function("GetWorkspacesForSiteAsync")
            //    .Returns<Workspace[]>();

            //builder.EntitySet<Order>("Orders");

            //var customerType = builder.EntityType<Customer>();

            //// Define the Bound function to a single entity
            //customerType
            //    .Function("GetCustomerOrdersTotalAmount")
            //    .Returns<int>();

            //// Define theBound function to collection
            //customerType
            //    .Collection
            //    .Function("GetCustomerByName")
            //    .ReturnsFromEntitySet<Customer>("Customers")
            //    .Parameter<string>("name");

            return builder.GetEdmModel();
        }
    }
}