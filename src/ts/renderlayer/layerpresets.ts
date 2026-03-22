export interface RenderLayerPreset {
    name: string;
    id: string;
    config: InputFormConfig
}

// region Common Inputs
export const textureIdInput: FormElementOptions = {
    label: "Texture Identifier",
    description: "The Minecraft Identifier path for this layer's texture. This will be used when exported, but won't do much for previewing in Blockbench.",
    type: "text"
}

// Map<Texture UUID, Texture Name> - UUID is used for finding the texture, name is used for visual input from user
let availableTextures: Record<string, string> = {}
availableTextures["no_texture"] = "No Texture";
Texture.all.forEach(texture => {
    availableTextures[texture.uuid] = texture.name;
})
export const previewTexUuidInput: FormElementOptions = {
    label: "Blockbench Preview Texture",
    description: "The preview texture used in Blockbench. This texture's width & length may be used in export, but the image itself can not be exported.",
    type: "select",
    options: availableTextures,
    value: Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
    // value: layerData.previewTexUuid ? layerData.previewTexUuid
    //     : Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
}

// endregion

// TODO - Nonsense to allow fields to be transferred between screens
export const RENDER_LAYER_PRESETS: Record<string, RenderLayerPreset> = {
    "entity": {
        name: "Textured Entity",
        id: "spectre:entity",
        config: {
            textureId: textureIdInput,
            previewTexUuid: previewTexUuidInput,
        }
    },
    "emissive": {
        name: "Emissive Texture",
        id: "spectre:emissive",
        config: {
            textureId: textureIdInput,
            emissiveLevel: {
                label: "Emissive Level",
                type: "num_slider",
                value: 255,
                min: 0,
                max: 255
            }
        }
    },
    "custom": {
        name: "Custom...",
        id: "",
        config: {
            customData: {
                label: "JSON",
                text: "",
                type: "info"
            }
        }
    }
}