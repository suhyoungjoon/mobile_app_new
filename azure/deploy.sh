#!/bin/bash

# Azure deployment script for InsightI application
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Azure Deployment Script for InsightI${NC}"
echo "=================================="

# Load environment variables
if [ -f .env ]; then
    source .env
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found, using defaults${NC}"
fi

# Set default values
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID:-"your-subscription-id"}
AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP:-"insighti-rg"}
AZURE_LOCATION=${AZURE_LOCATION:-"koreacentral"}
AZURE_APP_SERVICE_PLAN=${AZURE_APP_SERVICE_PLAN:-"insighti-plan"}
AZURE_WEB_APP_NAME=${AZURE_WEB_APP_NAME:-"insighti-app"}
AZURE_CONTAINER_REGISTRY=${AZURE_CONTAINER_REGISTRY:-"insightiacr"}
DB_PASSWORD=${DB_PASSWORD:-"insighti123"}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo "Please install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "Please run: az login"
    exit 1
fi

echo -e "${GREEN}✅ Azure CLI is ready${NC}"

# Set subscription
echo -e "${BLUE}📋 Setting Azure subscription...${NC}"
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# Create resource group
echo -e "${BLUE}📦 Creating resource group...${NC}"
az group create \
    --name "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --output table

# Create Container Registry
echo -e "${BLUE}🐳 Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_CONTAINER_REGISTRY" \
    --sku Basic \
    --admin-enabled true \
    --output table

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name "$AZURE_CONTAINER_REGISTRY" --resource-group "$AZURE_RESOURCE_GROUP" --query loginServer --output tsv)
echo -e "${GREEN}✅ ACR Login Server: $ACR_LOGIN_SERVER${NC}"

# Login to ACR
echo -e "${BLUE}🔐 Logging in to ACR...${NC}"
az acr login --name "$AZURE_CONTAINER_REGISTRY"

# Build and push backend image
echo -e "${BLUE}🔨 Building backend Docker image...${NC}"
docker build -t "$ACR_LOGIN_SERVER/insighti-backend:latest" ./backend
docker push "$ACR_LOGIN_SERVER/insighti-backend:latest"

# Build and push frontend image
echo -e "${BLUE}🔨 Building frontend Docker image...${NC}"
docker build -t "$ACR_LOGIN_SERVER/insighti-frontend:latest" ./webapp
docker push "$ACR_LOGIN_SERVER/insighti-frontend:latest"

# Create App Service Plan
echo -e "${BLUE}📋 Creating App Service Plan...${NC}"
az appservice plan create \
    --name "$AZURE_APP_SERVICE_PLAN" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --is-linux \
    --sku B1 \
    --output table

# Create PostgreSQL Flexible Server
echo -e "${BLUE}🗄️  Creating PostgreSQL Flexible Server...${NC}"
az postgres flexible-server create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "insighti-postgres" \
    --location "$AZURE_LOCATION" \
    --admin-user postgres \
    --admin-password "$DB_PASSWORD" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --public-access 0.0.0.0 \
    --storage-size 32 \
    --version 15 \
    --output table

# Create database
echo -e "${BLUE}📊 Creating database...${NC}"
az postgres flexible-server db create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server-name "insighti-postgres" \
    --database-name "insighti_db" \
    --output table

# Create Web App for backend
echo -e "${BLUE}🌐 Creating backend Web App...${NC}"
az webapp create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --plan "$AZURE_APP_SERVICE_PLAN" \
    --name "${AZURE_WEB_APP_NAME}-backend" \
    --deployment-container-image-name "$ACR_LOGIN_SERVER/insighti-backend:latest" \
    --output table

# Configure backend Web App
echo -e "${BLUE}⚙️  Configuring backend Web App...${NC}"
az webapp config appsettings set \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "${AZURE_WEB_APP_NAME}-backend" \
    --settings \
        NODE_ENV=production \
        PORT=3000 \
        DB_HOST="insighti-postgres.postgres.database.azure.com" \
        DB_PORT=5432 \
        DB_NAME=insighti_db \
        DB_USER=postgres \
        DB_PASSWORD="$DB_PASSWORD" \
        JWT_SECRET="${JWT_SECRET:-insighti-super-secret-jwt-key-2024}" \
        JWT_EXPIRES_IN=3d \
        UPLOAD_DIR=/app/uploads \
        MAX_FILE_SIZE=10485760 \
        SMS_SERVICE_ID="${SMS_SERVICE_ID:-your-service-id}" \
        SMS_ACCESS_KEY="${SMS_ACCESS_KEY:-your-access-key}" \
        SMS_SECRET_KEY="${SMS_SECRET_KEY:-your-secret-key}" \
        SMS_FROM_NUMBER="${SMS_FROM_NUMBER:-01012345678}"

# Create Web App for frontend
echo -e "${BLUE}🌐 Creating frontend Web App...${NC}"
az webapp create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --plan "$AZURE_APP_SERVICE_PLAN" \
    --name "${AZURE_WEB_APP_NAME}-frontend" \
    --deployment-container-image-name "$ACR_LOGIN_SERVER/insighti-frontend:latest" \
    --output table

# Configure frontend Web App
echo -e "${BLUE}⚙️  Configuring frontend Web App...${NC}"
az webapp config appsettings set \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "${AZURE_WEB_APP_NAME}-frontend" \
    --settings \
        NODE_ENV=production

# Enable continuous deployment
echo -e "${BLUE}🔄 Enabling continuous deployment...${NC}"
az webapp deployment container config \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "${AZURE_WEB_APP_NAME}-backend" \
    --enable-cd true

az webapp deployment container config \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "${AZURE_WEB_APP_NAME}-frontend" \
    --enable-cd true

# Get Web App URLs
BACKEND_URL=$(az webapp show --resource-group "$AZURE_RESOURCE_GROUP" --name "${AZURE_WEB_APP_NAME}-backend" --query defaultHostName --output tsv)
FRONTEND_URL=$(az webapp show --resource-group "$AZURE_RESOURCE_GROUP" --name "${AZURE_WEB_APP_NAME}-frontend" --query defaultHostName --output tsv)

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "=================================="
echo -e "Resource Group: ${GREEN}$AZURE_RESOURCE_GROUP${NC}"
echo -e "Location: ${GREEN}$AZURE_LOCATION${NC}"
echo -e "Container Registry: ${GREEN}$ACR_LOGIN_SERVER${NC}"
echo -e "PostgreSQL Server: ${GREEN}insighti-postgres.postgres.database.azure.com${NC}"
echo -e "Backend URL: ${GREEN}https://$BACKEND_URL${NC}"
echo -e "Frontend URL: ${GREEN}https://$FRONTEND_URL${NC}"
echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "1. Update frontend API URL to point to backend"
echo "2. Configure custom domain (optional)"
echo "3. Set up SSL certificates"
echo "4. Configure monitoring and logging"
echo "5. Set up backup and disaster recovery"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "- Database password: $DB_PASSWORD"
echo "- Update SMS configuration with real credentials"
echo "- Configure CORS settings for production"
echo "- Set up monitoring and alerting"
