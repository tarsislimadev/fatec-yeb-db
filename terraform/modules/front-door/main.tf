resource "azurerm_cdn_frontdoor_profile" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  sku_name            = "Premium_AzureFrontDoor"

  response_timeout_seconds = 30
}

# Backend pool for backend API
resource "azurerm_cdn_frontdoor_origin_group" "backend" {
  name                     = "${var.name}-backend-og"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  session_affinity_enabled = true

  health_probe {
    interval_in_seconds = 100
    path                = "/health"
    protocol            = "Https"
    request_type        = "GET"
  }

  load_balancing {
    additional_latency_in_milliseconds = 50
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "backend_origin" {
  name                          = "${var.name}-backend-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.backend.id
  enabled                       = true
  host_name                     = var.backend_fqdn
  http_port                     = 80
  https_port                    = 443
  origin_host_header            = var.backend_fqdn
  priority                      = 1
  weight                        = 1000
}

# Backend pool for frontend
resource "azurerm_cdn_frontdoor_origin_group" "frontend" {
  name                     = "${var.name}-frontend-og"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  session_affinity_enabled = false

  health_probe {
    interval_in_seconds = 100
    path                = "/"
    protocol            = "Https"
    request_type        = "GET"
  }

  load_balancing {
    additional_latency_in_milliseconds = 0
    sample_size                        = 4
    successful_samples_required        = 3
  }
}

resource "azurerm_cdn_frontdoor_origin" "frontend_origin" {
  name                          = "${var.name}-frontend-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.frontend.id
  enabled                       = true
  host_name                     = var.frontend_fqdn
  http_port                     = 80
  https_port                    = 443
  origin_host_header            = var.frontend_fqdn
  priority                      = 1
  weight                        = 1000
}

# Route for API
resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "api"
  cdn_frontdoor_profile_id      = azurerm_cdn_frontdoor_profile.this.id
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.backend.id
  enabled                       = true
  patterns_to_match             = ["/api*"]
  supported_protocols           = ["Http", "Https"]
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  link_to_default_domain        = true
}

# Route for frontend
resource "azurerm_cdn_frontdoor_route" "frontend" {
  name                          = "frontend"
  cdn_frontdoor_profile_id      = azurerm_cdn_frontdoor_profile.this.id
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.frontend.id
  enabled                       = true
  patterns_to_match             = ["/*"]
  supported_protocols           = ["Http", "Https"]
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  link_to_default_domain        = true
}

# Endpoint
resource "azurerm_cdn_frontdoor_endpoint" "this" {
  name                     = var.name
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
}
