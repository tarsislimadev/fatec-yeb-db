resource "azurerm_container_app" "this" {
  name                         = var.name
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  location                     = var.location

  revision_mode = "Single"

  dynamic "identity" {
    for_each = var.acr_identity_id != null ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [var.acr_identity_id]
    }
  }

  template {
    container {
      name   = var.name
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    scale {
      min_replicas = var.min_replicas
      max_replicas = var.max_replicas
    }
  }

  dynamic "ingress" {
    for_each = var.ingress_enabled ? [1] : []
    content {
      allow_insecure_connections = false
      external_enabled           = true
      target_port                = var.ingress_target_port
      traffic_weight {
        latest_revision = true
        percentage      = 100
      }
    }
  }
}
