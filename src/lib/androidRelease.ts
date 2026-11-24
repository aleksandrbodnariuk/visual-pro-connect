export const APK_BUCKET = "android-releases";
export const APK_MAX_BYTES = 50 * 1024 * 1024;

export function releasePath(userId: string, releaseId: string): string {
  return `${userId}/android/${releaseId}-spilnota-bc.apk`;
}

export function needsAndroidUpdate(installedBuild: string, publishedBuild: string): boolean {
  return Number(publishedBuild) > Number(installedBuild);
}

export async function validateApk(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(".apk")) throw new Error("Оберіть файл .apk");
  if (!file.size || file.size > APK_MAX_BYTES) throw new Error("Файл має бути від 1 байта до 50 МБ");
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4) throw new Error("Це не файл Android-застосунку");
}