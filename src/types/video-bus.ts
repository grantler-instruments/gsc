/** Visual output destination — routes video/image cues to a dedicated output window. */
export interface VideoBus {
  id: string;
  name: string;
  /** 0–1 master dimmer for the whole bus. */
  opacity: number;
  muted?: boolean;
}
