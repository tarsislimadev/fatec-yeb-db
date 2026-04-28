# Azure Publishing Guide for fatec-yeb-db

Complete Terraform-based infrastructure-as-code solution for deploying the `fatec-yeb-db` application to Azure with automated CI/CD via GitHub Actions.

## 🚀 Quick Links

**Just deployed? Start here:** [Deployment Checklist](./AZURE_DEPLOYMENT_CHECKLIST.md)

**Ready to deploy? Read this first:** [Deployment Summary](./AZURE_DEPLOYMENT_SUMMARY.md)

**Step-by-step walkthrough:** [Terraform Quickstart](./terraform/QUICKSTART.md)

**Understanding the architecture?** [Azure Terraform Design](./docs/azure.terraform.md)

**Testing after deployment?** [Testing & Validation Guide](./docs/azure-testing-validation.md)

## 📋 What's Included

### Infrastructure as Code
- **7 Terraform modules** covering all Azure services (ACR, Container Apps, PostgreSQL, Redis, Key Vault, Log Analytics, Front Door)
- **Production environment** fully configured and ready to apply
- **Automated state management** using Azure Storage backend

### CI/CD Pipeline
- **GitHub Actions workflow** that automatically:
  - Builds and pushes Docker images to ACR
  - Applies Terraform infrastructure changes
  - Runs database migrations
  - Validates health endpoints

### Documentation
| Document | Purpose |
|----------|---------|
| [AZURE_DEPLOYMENT_SUMMARY.md](./AZURE_DEPLOYMENT_SUMMARY.md) | Overview of complete solution |
| [AZURE_DEPLOYMENT_CHECKLIST.md](./AZURE_DEPLOYMENT_CHECKLIST.md) | Step-by-step checklist to follow |
| [terraform/QUICKSTART.md](./terraform/QUICKSTART.md) | Detailed deployment walkthrough |
| [docs/azure.terraform.md](./docs/azure.terraform.md) | Architecture & design decisions |
| [docs/azure-testing-validation.md](./docs/azure-testing-validation.md) | Comprehensive testing guide |

## 🎯 Quick Start (5 minutes)

### Prerequisites
- Azure subscription with Contributor access
- `az` CLI and `terraform` installed
- GitHub Actions enabled on repo

### Steps

1. **Bootstrap state storage** (one-time):
   ```bash
   az group create -n phone-list-tfstate-rg -l eastus
   az storage account create -n phoneliststate$(date +%s) \
     -g phone-list-tfstate-rg --sku Standard_LRS --kind StorageV2
   az storage container create -n tfstate \
     --account-name <storage-account-name>
   ```

2. **Create service principal** (one-time):
   ```bash
   az ad sp create-for-rbac --name phone-list-deployer --role Contributor
   # Save the output (especially password!)
   ```

3. **Add GitHub secrets** (see AZURE_DEPLOYMENT_CHECKLIST.md for full list):
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_CLIENT_SECRET`
   - `TF_STATE_*` (from storage account created above)
   - `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_DB_PASSWORD`, `JWT_SECRET`
   - `ACR_*` (container registry credentials)

4. **Customize Terraform variables**:
   ```bash
   cp terraform/envs/prod/terraform.tfvars.example \
      terraform/envs/prod/terraform.tfvars
   # Edit with your values (resource names, passwords, etc.)
   ```

5. **Deploy**:
   ```bash
   git add terraform/ .github/workflows/ docs/
   git commit -m "Deploy to Azure via Terraform"
   git push origin main
   # Watch GitHub Actions → Actions tab
   ```

6. **Verify**:
   ```bash
   cd terraform/envs/prod
   terraform output
   # Test URLs from output
   ```

**Total time:** ~30-45 minutes (mostly waiting for resource provisioning)

## 📊 Architecture

```
Source Code (backend, frontend) → GitHub
                                      ↓
                           GitHub Actions Workflow
                                      ↓
                         Builds images, runs Terraform
                                      ↓
                    ┌─────────────────┴─────────────────┐
                    ↓                                   ↓
        Azure Container Registry              Azure Resources
                    ↓                                   ↓
        [backend image]  [frontend image]      [ACR, Container Apps, 
                                                PostgreSQL, Redis, 
                                                Key Vault, Log Analytics]
                    ↓                                   ↓
                    └─────────────────┬─────────────────┘
                                      ↓
                                 Public URLs
                            (https://backend.azurecontainers.io)
                            (https://frontend.azurecontainers.io)
```

## 🔐 Security Features

✅ **Secrets Management** — All sensitive values in Azure Key Vault
✅ **Managed Identity** — Container Apps authenticate to ACR without passwords
✅ **HTTPS Everywhere** — All endpoints use TLS
✅ **Infrastructure as Code** — Auditable, version-controlled infrastructure changes
✅ **RBAC** — Service principal scoped to Contributor role
✅ **Fine-grained secrets** — GitHub secrets, not stored in code

## 💰 Cost Estimate

| Service | Tier | Cost/Month |
|---------|------|-----------|
| Container Apps (2 apps, pay-per-use) | - | ~$25-50 |
| PostgreSQL Flexible | B_Standard_B1ms | ~$15-30 |
| Redis Cache | Basic | ~$20-30 |
| Log Analytics | Per GB ingestion | ~$5-20 |
| **Total (minimal)** | | **~$60-130** |

For production with larger instances, expect 2-3x higher costs.

## 📖 Documentation Map

```
Start Here
    ↓
AZURE_DEPLOYMENT_SUMMARY.md (5 min read)
    ↓
    ├─→ AZURE_DEPLOYMENT_CHECKLIST.md (your operational guide)
    │
    ├─→ terraform/QUICKSTART.md (step-by-step)
    │
    ├─→ terraform/README.md (Terraform structure)
    │
    ├─→ docs/azure.terraform.md (architecture deep-dive)
    │
    └─→ docs/azure-testing-validation.md (testing & ops)
```

## 🛠 Common Operations

### View deployment outputs
```bash
cd terraform/envs/prod
terraform output
```

### View application logs
```bash
az container app logs -n phone-list-api -g phone-list-rg
az container app logs -n phone-list-web -g phone-list-rg
```

### Rollback to previous image
```bash
cd terraform/envs/prod
terraform apply -var="image_tag=<previous-commit-sha>"
```

### Scale container
```bash
# Edit terraform/envs/prod/variables.tf
backend_cpu    = "1.0"      # increase
backend_memory = "2.0Gi"    # increase

# Apply
terraform apply -var-file=terraform.tfvars
```

### Destroy everything (cleanup/testing)
```bash
cd terraform/envs/prod
terraform destroy -var-file=terraform.tfvars
```

## 🔄 CI/CD Workflow

Every push to `main` triggers:

1. **Build** — Compile Docker images with commit SHA
2. **Push** — Upload to Azure Container Registry
3. **Provision** — Terraform applies infrastructure changes
4. **Migrate** — Run database schema migrations
5. **Validate** — Health check endpoints
6. **Report** — Summary of deployed URLs

**Deployment time:** 15-25 minutes

## ⚠️ Important Notes

### First Time?
- Read [AZURE_DEPLOYMENT_SUMMARY.md](./AZURE_DEPLOYMENT_SUMMARY.md) first
- Follow [AZURE_DEPLOYMENT_CHECKLIST.md](./AZURE_DEPLOYMENT_CHECKLIST.md) step-by-step
- Don't skip the state storage bootstrap step!

### Passwords
- PostgreSQL passwords must be 8+ characters with complexity (upper, lower, number, symbol)
- JWT secret should be 32+ random characters
- Store passwords securely (not in code!)

### Resource Names
- Must be globally unique in Azure: ACR, PostgreSQL server, Key Vault, Redis
- Consider adding random suffix (e.g., `phone-list-acr-12345`)

### Costs
- Monitor costs regularly in Azure Portal
- Set up budget alerts
- Stop containers during development (scale to 0 replicas) to save costs

## 🆘 Troubleshooting

**Quick fixes:**
- Images not showing in ACR? → Push again via GitHub Actions or `docker push` manually
- Containers won't start? → Check logs: `az container app logs -n phone-list-api`
- Database connection failed? → Verify firewall rules, credentials in Key Vault
- Terraform errors? → Run `terraform plan` locally first to catch issues

For detailed troubleshooting, see [docs/azure-testing-validation.md](./docs/azure-testing-validation.md#troubleshooting)

## 📚 Related Documentation

- Existing DEPLOYMENT.md: [DEPLOYMENT.md](./DEPLOYMENT.md) (now includes Azure Terraform option)
- Project README: [README.md](./README.md)

## ✅ Success Criteria

Your deployment is successful when:
- ✅ GitHub Actions workflow completes without errors
- ✅ Container Apps are in "Running" state
- ✅ Backend `/health` returns HTTP 200
- ✅ Frontend loads in browser
- ✅ Can register/login/create data through UI
- ✅ Logs visible in Log Analytics

## 🚀 Next Steps

1. **Understand** — Read [AZURE_DEPLOYMENT_SUMMARY.md](./AZURE_DEPLOYMENT_SUMMARY.md)
2. **Prepare** — Use [AZURE_DEPLOYMENT_CHECKLIST.md](./AZURE_DEPLOYMENT_CHECKLIST.md)
3. **Deploy** — Follow [terraform/QUICKSTART.md](./terraform/QUICKSTART.md)
4. **Test** — Use [docs/azure-testing-validation.md](./docs/azure-testing-validation.md)
5. **Operate** — Check logs, monitor, scale as needed

---

**Questions?** See the comprehensive guides linked above.

**Ready?** Start with [AZURE_DEPLOYMENT_SUMMARY.md](./AZURE_DEPLOYMENT_SUMMARY.md) → 5 minute read!
