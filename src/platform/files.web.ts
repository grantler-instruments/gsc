/** Browser: drag-and-drop and File API only — no OS paths. */

export function filesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  return Array.from(dataTransfer.files);
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
