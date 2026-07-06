import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  type ShaderMaterial,
  Texture,
  type Texture as ThreeTexture,
  VideoTexture,
} from "three";
import type { CompositorLayer } from "../../lib/video-compositor";
import {
  configureTextureSampling,
  createLayerMaterial,
  layerMaterialUniforms,
} from "./layer-material";

interface LayerMeshEntry {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  texture: ThreeTexture;
  source: TexImageSource;
}

export class LayerScene {
  readonly scene = new Scene();
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly entries = new Map<string, LayerMeshEntry>();
  private viewWidth = 1;
  private viewHeight = 1;

  constructor() {
    this.camera.position.z = 1;
  }

  resize(width: number, height: number): void {
    this.viewWidth = Math.max(1, width);
    this.viewHeight = Math.max(1, height);
    for (const entry of this.entries.values()) {
      this.syncEntryUniforms(entry);
    }
  }

  syncLayers(layers: CompositorLayer[]): void {
    const nextIds = new Set(layers.map((layer) => layer.id));

    for (const id of [...this.entries.keys()]) {
      if (!nextIds.has(id)) {
        this.removeEntry(id);
      }
    }

    for (const layer of layers) {
      this.upsertLayer(layer);
    }
  }

  updateFrame(): void {
    for (const entry of this.entries.values()) {
      if (entry.texture instanceof VideoTexture) {
        entry.texture.needsUpdate = true;
        continue;
      }
      entry.texture.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const id of [...this.entries.keys()]) {
      this.removeEntry(id);
    }
    this.geometry.dispose();
  }

  private upsertLayer(layer: CompositorLayer): void {
    let entry = this.entries.get(layer.id);
    if (!entry || entry.source !== layer.source) {
      if (entry) this.removeEntry(layer.id);
      entry = this.createEntry(layer);
      this.entries.set(layer.id, entry);
      this.scene.add(entry.mesh);
    }

    entry.mesh.renderOrder = layer.zIndex;
    entry.mesh.visible = layer.ready && layer.opacity > 0;
    const uniforms = layerMaterialUniforms(entry.mesh.material);
    uniforms.uOpacity.value = Math.max(0, Math.min(1, layer.opacity));
    uniforms.uTexSize.value.set(layer.sourceWidth, layer.sourceHeight);
    this.syncEntryUniforms(entry);
  }

  private createEntry(layer: CompositorLayer): LayerMeshEntry {
    const material = createLayerMaterial();
    const mesh = new Mesh<PlaneGeometry, ShaderMaterial>(this.geometry, material);
    const texture =
      layer.source instanceof HTMLVideoElement
        ? new VideoTexture(layer.source)
        : new Texture(layer.source as HTMLImageElement);
    configureTextureSampling(texture);
    texture.needsUpdate = true;

    const uniforms = layerMaterialUniforms(material);
    uniforms.uTexture.value = texture;
    uniforms.uTexSize.value.set(layer.sourceWidth, layer.sourceHeight);
    uniforms.uOpacity.value = Math.max(0, Math.min(1, layer.opacity));
    uniforms.uViewSize.value.set(this.viewWidth, this.viewHeight);

    return { mesh, texture, source: layer.source };
  }

  private syncEntryUniforms(entry: LayerMeshEntry): void {
    const uniforms = layerMaterialUniforms(entry.mesh.material);
    uniforms.uViewSize.value.set(this.viewWidth, this.viewHeight);
  }

  private removeEntry(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.scene.remove(entry.mesh);
    entry.mesh.material.dispose();
    entry.texture.dispose();
    this.entries.delete(id);
  }
}
