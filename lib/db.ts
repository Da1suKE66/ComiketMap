import { dataSchema, type AppData, type ImageAsset, uid } from "./model";
let connection: Promise<IDBDatabase> | null = null;
function database() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("comipath-c109", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("notebook");
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = null; }; resolve(request.result); };
    request.onerror = () => { connection = null; reject(request.error); };
    request.onblocked = () => { connection = null; reject(new Error("请关闭其他 ComiPath 标签页后重试")); };
  });
  return connection;
}
export async function loadData(): Promise<AppData | null> {
  const db = await database(); return new Promise((resolve, reject) => {
    const request = db.transaction("notebook", "readonly").objectStore("notebook").get("data");
    request.onsuccess = () => { try { resolve(request.result ? dataSchema.parse(request.result) : null); } catch { reject(new Error("本地数据读取失败；请保留浏览器数据并尝试导入备份。")); } }; request.onerror = () => reject(request.error);
  });
}
export async function saveData(data: AppData) {
  const db = await database(); return new Promise<void>((resolve, reject) => { const tx = db.transaction("notebook", "readwrite"); tx.objectStore("notebook").put(data, "data"); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
export async function readImage(file: File): Promise<ImageAsset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("请选择 PNG、JPG 或 WebP 图片");
  if (file.size > 15 * 1024 * 1024) throw new Error("单张原图请小于 15 MB");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    if (!img.width || !img.height || img.width * img.height > 60_000_000) throw new Error("图片尺寸过大，请缩小后重试");
    const scale = Math.min(1, 2400 / Math.max(img.width, img.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("浏览器暂时无法读取图片");
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { id: uid(), name: file.name.slice(0, 200), src: canvas.toDataURL("image/jpeg", 0.88) };
  } finally { URL.revokeObjectURL(url); }
}
