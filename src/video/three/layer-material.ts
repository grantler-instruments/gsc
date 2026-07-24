import {
  ClampToEdgeWrapping,
  LinearFilter,
  type Material,
  ShaderMaterial,
  type Texture,
  Uniform,
  Vector2,
} from "three";

export const LAYER_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const LAYER_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uTexSize;
uniform vec2 uViewSize;
uniform float uOpacity;

varying vec2 vUv;

bool containUv(vec2 uv, out vec2 texUv) {
  if (uTexSize.x <= 0.0 || uTexSize.y <= 0.0) {
    return false;
  }

  float texAspect = uTexSize.x / uTexSize.y;
  float viewAspect = uViewSize.x / uViewSize.y;
  vec2 scale;
  if (texAspect > viewAspect) {
    scale = vec2(1.0, viewAspect / texAspect);
  } else {
    scale = vec2(texAspect / viewAspect, 1.0);
  }

  texUv = (uv - 0.5) / scale + 0.5;
  return texUv.x >= 0.0 && texUv.x <= 1.0 && texUv.y >= 0.0 && texUv.y <= 1.0;
}

void main() {
  vec2 texUv;
  if (!containUv(vUv, texUv)) {
    discard;
  }

  vec4 color = texture2D(uTexture, texUv);
  gl_FragColor = vec4(color.rgb, color.a * uOpacity);
}
`;

export interface LayerMaterialUniforms {
  uTexture: Uniform<Texture | null>;
  uTexSize: Uniform<Vector2>;
  uViewSize: Uniform<Vector2>;
  uOpacity: Uniform<number>;
}

export function createLayerMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTexture: new Uniform<Texture | null>(null),
      uTexSize: new Uniform(new Vector2(1, 1)),
      uViewSize: new Uniform(new Vector2(1, 1)),
      uOpacity: new Uniform(1),
    },
    vertexShader: LAYER_VERTEX_SHADER,
    fragmentShader: LAYER_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

export function layerMaterialUniforms(material: Material): LayerMaterialUniforms {
  if (!(material instanceof ShaderMaterial)) {
    throw new Error("Expected ShaderMaterial");
  }
  return material.uniforms as unknown as LayerMaterialUniforms;
}

export function configureTextureSampling(texture: Texture): void {
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
}
