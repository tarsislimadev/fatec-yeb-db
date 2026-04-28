output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "server_id" {
  value = azurerm_postgresql_flexible_server.this.id
}

output "database_url" {
  value     = "postgresql://${var.database_user}:${var.database_password}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/${var.database_name}"
  sensitive = true
}
