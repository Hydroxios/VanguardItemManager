# Documentation Technique - Vanguard Item Manager

## Table des Matières
1. [Architecture Technique](#architecture-technique)
2. [Structure du Projet](#structure-du-projet)
3. [Configuration Requise](#configuration-requise)
4. [Installation et Démarrage](#installation-et-démarrage)
5. [Variables d'Environnement](#variables-denvironnement)
6. [API Bungie](#api-bungie)
7. [Composants Principaux](#composants-principaux)
8. [Hooks Personnalisés](#hooks-personnalisés)
9. [Gestion d'État](#gestion-détat)
10. [Styles et Thème](#styles-et-thème)
11. [Tests](#tests)
12. [Déploiement](#déploiement)
13. [Contributions](#contributions)
14. [Licence](#licence)

## Architecture Technique

### Stack Technique
- **Framework** : Next.js 15 (avec App Router)
- **Langage** : TypeScript 5.x
- **Styling** : Tailwind CSS 3.4
- **Gestion d'État** : React Query (TanStack) 5.74
- **Authentification** : OAuth 2.0 via Bungie.net
- **Hébergement** : Firebase Hosting
- **Outils de Développement** : 
  - ESLint 9.x
  - TypeScript
  - Tailwind CSS

## Structure du Projet

```
src/
├── app/                    # Routes et pages Next.js
│   ├── api/               # Routes API
│   ├── components/        # Composants partagés
│   │   ├── character/     # Composants liés aux personnages
│   │   ├── debug/         # Outils de débogage
│   │   └── inputs/        # Composants de formulaire
│   └── login/             # Pages d'authentification
│
└── lib/                   # Code métier et utilitaires
    ├── api/               # Clients API
    ├── hooks/             # Hooks personnalisés
    └── types/             # Définitions de types TypeScript
```

## Configuration Requise

- Node.js 18.0.0 ou supérieur
- npm 9.0.0 ou supérieur
- Compte développeur Bungie.net avec clé API

## Installation et Démarrage

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Hydroxios/VanguardItemManager.git
   cd vanguard-item-manager
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   Créer un fichier `.env` à la racine du projet (voir section suivante).

4. **Démarrer le serveur de développement**
   ```bash
   npm run dev
   ```

5. **Accéder à l'application**
   Ouvrir http://localhost:3000 dans votre navigateur.

## Variables d'Environnement

Créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Clé API Bungie.net
NEXT_PUBLIC_BUNGIE_API_KEY=votre_cle_api

# URL de redirection OAuth (doit correspondre à celle configurée sur Bungie.net)
NEXT_PUBLIC_BUNGIE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Configuration Firebase (si nécessaire)
NEXT_PUBLIC_FIREBASE_API_KEY=votre_cle_firebase
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_projet
```

## API Bungie

L'application utilise l'API Bungie pour accéder aux données de Destiny 2. Les principales fonctionnalités incluent :

- Récupération des personnages et de l'inventaire
- Gestion des équipements et des objets
- Authentification utilisateur via Bungie.net

### Configuration de l'API Bungie

1. Créer un compte développeur sur [Bungie.net](https://www.bungie.net/en/Application)
2. Créer une nouvelle application
3. Configurer les URI de redirection OAuth
4. Copier la clé API dans votre fichier `.env`

## Composants Principaux

### 1. AppView
Composant racine de l'application qui gère la mise en page principale.

### 2. CharacterSelector
Permet de sélectionner un personnage et affiche ses informations de base.

### 3. LoadoutEditor
Interface pour créer et gérer des équipements personnalisés.

### 4. ItemTooltip / GlobalItemTooltip
Affiche des informations détaillées sur les objets au survol.

### 5. FooterMenu
Barre de navigation inférieure avec les actions principales.

## Hooks Personnalisés

### useAuth
Gère l'authentification avec l'API Bungie.

```typescript
const { isAuthenticated, user, login, logout } = useAuth();
```

### useProfile
Récupère et gère le profil du joueur.

```typescript
const { profile } = useProfile();
```



## Gestion d'État

L'application utilise React Query pour la gestion des états serveur et la mise en cache des données. Les principales caractéristiques incluent :

- Mise en cache automatique des requêtes API
- Revalidation en arrière-plan
- Gestion des erreurs centralisée
- Optimistic updates pour une meilleure réactivité

## Styles et Thème

L'application utilise Tailwind CSS pour le styling avec une configuration personnalisée. Le fichier de configuration principal se trouve à la racine :

- `tailwind.config.ts` - Configuration de Tailwind CSS
- `src/app/globals.css` - Styles globaux

## Déploiement

### Déploiement sur Firebase

1. Installer Firebase CLI :
   ```bash
   npm install -g firebase-tools
   ```

2. Se connecter à Firebase :
   ```bash
   firebase login
   ```

3. Déployer l'application :
   ```bash
   npm run deploy
   ```

## Contributions

Les contributions sont les bienvenues ! Voici comment contribuer :

1. Forker le dépôt
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/ma-nouvelle-fonctionnalite`)
3. Committer vos changements (`git commit -am 'Ajouter une nouvelle fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/ma-nouvelle-fonctionnalite`)
5. Créer une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
