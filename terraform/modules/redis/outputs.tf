output "hostname" {
  value = azurerm_redis_cache.this.hostname
}

output "port" {
  value = azurerm_redis_cache.this.port
}

output "primary_connection_string" {
  value     = azurerm_redis_cache.this.primary_connection_string
  sensitive = true
}

output "redis_url" {
  value     = "redis://:${azurerm_redis_cache.this.primary_access_key}@${azurerm_redis_cache.this.hostname}:${azurerm_redis_cache.this.port}"
  sensitive = true
}
