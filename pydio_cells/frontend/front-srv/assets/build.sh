#!/usr/bin/env bash

# Installation de pnpm si nécessaire
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

# Installation des dépendances
pnpm install