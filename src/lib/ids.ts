// Ids aleatorios sin guiones: también sirven como segmento de field path
// en updateDoc (sets.<id>.weightKg).
export const newId = () => crypto.randomUUID().replaceAll('-', '')
