// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require("path");
const fs = require('fs');
const webpack = require("webpack");
const dotenv = require('dotenv');

const CompressionPlugin = require("compression-webpack-plugin");

const {configLoader} = require('../webpack-commons')

const dirs = (p) => fs.readdirSync(p).filter(f => fs.statSync(p+"/"+f).isDirectory());

const parseArgs = (args) => {
    const parsedArgs = {};
    args.forEach((arg) => {
        const parts = arg.split("=");
        parsedArgs[parts[0]] = parts[1];
    });
    return parsedArgs;
};
const args = parseArgs(process.argv.slice(2))

const entries = dirs('res/js/ui').reduce((obj, folder) => {
    if(process.env.NODE_ENV !== 'production' && args['--name'] && folder !== args['--name']){
        return obj;
    }
    obj['Pydio'+folder] = './res/js/ui/'+folder+'/index.js'
    return obj
}, {})

console.log('Compiling Entries', entries)

const config = configLoader(entries, path.resolve(__dirname, "res/dist/libs"), CompressionPlugin)
config.output.publicPath='plug/gui.ajax/res/dist/libs/'
config.output.clean = process.env.NODE_ENV === 'production'

// Chercher le fichier .env dans plusieurs emplacements possibles
// 1. Dans le dossier cells/ (3 niveaux au-dessus)
// 2. À la racine du projet (4 niveaux au-dessus)
// 3. Dans le dossier gui.ajax lui-même
const possibleEnvPaths = [
    path.resolve(__dirname, '../../../.env'),        // cells/.env
    path.resolve(__dirname, '../../../../.env'),     // racine projet/.env
    path.resolve(__dirname, '.env')                   // gui.ajax/.env
];

let envPath = null;
for (const envFile of possibleEnvPaths) {
    if (fs.existsSync(envFile)) {
        envPath = envFile;
        console.log(`[webpack] Using .env file: ${envPath}`);
        break;
    }
}

// Charger les variables d'environnement depuis .env manuellement
// Cela évite les conflits avec DefinePlugin
if (envPath) {
    const envConfig = dotenv.config({ path: envPath });
    if (envConfig.error) {
        console.warn(`[webpack] Warning: Could not load .env file: ${envConfig.error}`);
    }
}

// Injecter les variables dans le code compilé
// Note: Les variables système (process.env) ont priorité sur le fichier .env
config.plugins.push(
    // Injecter explicitement les variables dans le code compilé
    new webpack.DefinePlugin({
        'process.env.CELLS_ARCHIVE_API_BASE_URL': JSON.stringify(
            process.env.CELLS_ARCHIVE_API_BASE_URL || ''
        ),
        // Variables pour les liens externes (maintenant utilisées uniquement pour compatibilité)
        // Note: Le code utilise maintenant window.CELLS_EXTERNAL_URLS injecté au runtime
        // Scanner/Digitize désactivé - forcer à vide pour supprimer le bouton
        'process.env.CELLS_SCANNER_URL': JSON.stringify(''),
        'process.env.CELLS_SUPERVISION_CONSOLE_URL': JSON.stringify(
            process.env.CELLS_SUPERVISION_CONSOLE_URL || ''
        ),
        // Variable globale accessible depuis le navigateur (pour compatibilité avec l'ancien code)
        // Scanner/Digitize désactivé - forcer à vide pour supprimer le bouton
        'window.CELLS_EXTERNAL_URLS': JSON.stringify({
            scanner: '', // Forcé à vide pour supprimer le bouton Digitize
            supervisionConsole: process.env.CELLS_SUPERVISION_CONSOLE_URL || ''
        })
    })
)

config.optimization =  {
    splitChunks: {
        cacheGroups: {
            vendor: {
                test: /[\\/]node_modules([\\/])(compromise)/,
                name: 'compromise',
                chunks: 'all',
            },
        },
    },
};


module.exports = () => {
    return config;
};
