# Database Setup Guide for UTXO System

## PostgreSQL Setup (Recommended)

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Arch/Manjaro
sudo pacman -S postgresql

# macOS
brew install postgresql
```

### 2. Start PostgreSQL Service

```bash
# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Arch/Manjaro
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS
brew services start postgresql
```

### 3. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE verus_utxo_db;
CREATE USER verus_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE verus_utxo_db TO verus_user;
\q
```

### 4. Update .env.local

```bash
DATABASE_URL=postgresql://verus_user:your_secure_password@localhost:5432/verus_utxo_db
```

## SQLite Setup (Development/Testing)

### 1. No Installation Required

SQLite comes with Node.js

### 2. Update .env.local

```bash
DATABASE_URL=sqlite:./data/utxo.db
```

### 3. Create Data Directory

```bash
mkdir -p data
```

## Docker Setup (Alternative)

### 1. Create docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: verus_utxo_db
      POSTGRES_USER: verus_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 2. Start Database

```bash
docker-compose up -d
```

### 3. Update .env.local

```bash
DATABASE_URL=postgresql://verus_user:your_secure_password@localhost:5432/verus_utxo_db
```

## Quick Start (Recommended)

For immediate testing, use SQLite:

1. Copy the example config:

```bash
cp utxo-config.example .env.local
```

2. Edit .env.local and set:

```bash
DATABASE_URL=sqlite:./data/utxo.db
UTXO_DATABASE_ENABLED=true
```

3. Create data directory:

```bash
mkdir -p data
```

4. Restart your application

```bash
npm run dev
```

## Production Setup

For production, use PostgreSQL with these settings:

```bash
# .env.local
DATABASE_URL=postgresql://verus_user:your_secure_password@localhost:5432/verus_utxo_db
UTXO_DATABASE_ENABLED=true
DB_POOL_MIN=5
DB_POOL_MAX=20
UTXO_SYNC_INTERVAL=300000
```
