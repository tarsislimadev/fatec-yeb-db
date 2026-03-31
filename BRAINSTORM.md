## 

```bash
# Install Azure CLI and Copilot CLI
winget install --exact --id Microsoft.AzureCLI
winget install GitHub.Copilot
```

## 

```bash
az logout

az login # Use tarsis.lima@fatec.sp.gov.br

az account list --output table

az group create --name YebResourceGroup1 --location eastus
```

## 

```json
{
  "id": "/subscriptions/e1c1d80e-93c2-4f73-9fd3-e8b804ade706/resourceGroups/YebResourceGroup1",
  "location": "eastus",
  "managedBy": null,
  "name": "YebResourceGroup1",
  "properties": {
    "provisioningState": "Succeeded"
  },
  "tags": null,
  "type": "Microsoft.Resources/resourceGroups"
}
```

##

```bash
az vm create --resource-group YebResourceGroup1 --name YebVitualMachine1 --image Ubuntu2204 --size Standard_B1s --admin-username azureuser --generate-ssh-keys --location eastus2
```

##

```bash
ssh azureuser@20.110.17.54
```

##

```bash
sudo apt -y update && sudo apt -y install docker-compose

curl -fsSL "https://raw.githubusercontent.com/tarsislimadev/debian/refs/heads/main/src/install/docker.sh" | bash
```

##

```bash
scp -r . azureuser@20.110.17.54:~/fatec_yeb_db
```

##

```bash
ssh azureuser@20.110.17.54
cd fatec_yeb_db
sudo docker-compose up -d
```
