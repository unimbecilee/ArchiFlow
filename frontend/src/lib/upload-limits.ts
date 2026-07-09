/** Seuil : au-dessus, upload MPU résilient ; en dessous, POST classique 20 Mo. */
export const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** Plafond fichier résilient (50 Go par défaut, aligné backend). */
export const MAX_RESUMABLE_FILE_GB = 50;
export const MAX_RESUMABLE_FILE_BYTES = MAX_RESUMABLE_FILE_GB * 1024 * 1024 * 1024;

export const MAX_RESUMABLE_PARALLEL_PARTS = 4;
export const MAX_RESUMABLE_ACTIVE_FILES = 3;
