output "workspace_id" {
  value = azurerm_log_analytics_workspace.this.id
}

output "workspace_key" {
  value     = azurerm_log_analytics_workspace.this.primary_shared_key
  sensitive = true
}
