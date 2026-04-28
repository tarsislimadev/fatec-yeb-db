output "secrets" {
  value = {
    for k, v in azurerm_key_vault_secret.secrets : k => v.id
  }
  sensitive = true
}
