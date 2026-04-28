Terraform for fatec-yeb-db

This folder contains the Terraform skeleton used to provision Azure resources
for `fatec-yeb-db`. The layout is intentionally minimal — use it as a starting
point. See `../docs/azure.terraform.md` for the high-level plan.

Quickstart (bootstrap remote state)

1. Create a resource group and storage account (one-off):

```bash
az group create -n phone-list-tfstate-rg -l eastus
az storage account create -n phoneliststate$RANDOM -g phone-list-tfstate-rg -l eastus --sku Standard_LRS --kind StorageV2
STORAGE_NAME=$(az storage account list -g phone-list-tfstate-rg --query "[0].name" -o tsv)
az storage container create --account-name $STORAGE_NAME -n tfstate
```

2. Edit `envs/prod/backend.tf` variables to match the storage account and
   container names, then run Terraform in `terraform/envs/prod`.
