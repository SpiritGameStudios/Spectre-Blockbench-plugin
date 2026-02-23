import {getRenderLayersProperty} from "./properties";

export const SPECTRE_CODEC_FORMAT_ID: string = "spectre_entity";

// TODO - Default to null layer, either list of preset buttons or button for presets (dropdown like mesh?)
export interface SpectreExportFormat {
    author?: string,
    version: string,
    layers?: Array<RenderLayerExport>
    bones?: Array<BoneExport>
}

export interface RenderLayerExport {
    name: string, // No duplicates allowed - any duplicates will have an index number appended to its name
    type: string,
    [data: string]: any
}

export interface BoneExport {
    name: string, // Duplicates allowed
    layer: string,
    pivot: ArrayVector3,
    rotation: ArrayVector3,
    scale: ArrayVector3,
    cubes: Array<CubeExport>
    children?: Array<BoneExport>
}

export interface CubeExport {
    name: string, // Duplicates allowed
    from: ArrayVector3,
    to: ArrayVector3,
    uv: ArrayVector2
}

export const SPECTRE_CODEC: Codec = new Codec(SPECTRE_CODEC_FORMAT_ID, {
    name: "Spectre Entity Model",
    extension: "json",
    remember: true,
    support_partial_export: true,
    load_filter: {
        type: "json",
        extensions: ["json"],
    },
    // Note: the order of which fields are added to objects are the same order they're outputted in JSON
    compile(options?: any): any {
        const layersExport: Array<RenderLayerExport> = [];
        for (const layer of getRenderLayersProperty()) {
            const layerExport: RenderLayerExport = {
                name: layer.data.name,
                type: layer.data.typeId,
            }
            if(layer.data.textureId) layerExport.texture = layer.data.textureId;
            if(layer.hasTexture()) {
                let texture: Texture = layer.getTexture();
                layerExport.texture_size = [texture.width, texture.height];
            }
            layersExport.push(layerExport);
        }



        const spectreExport: SpectreExportFormat = {
            version: "0.0.1",
            author: Settings.get("username") ? Settings.get("username").toString() : undefined,
            layers: layersExport
        }

        return compileJSON(spectreExport);
    }
})

export const SPECTRE_FORMAT: ModelFormat = new ModelFormat(SPECTRE_CODEC_FORMAT_ID, {
    id: SPECTRE_CODEC_FORMAT_ID,
    name: "Spectre Entity",
    description: "Entity model for Minecraft Java mods using the Spectre library.",
    icon: "resize",
    category: "minecraft",
    target: "Minecraft: Java Edition",
    format_page: {
        content: [ // TODO - Spectre docs page
            {type: 'h3', text: tl('mode.start.format.informations')},
            {text: "* Bones & cubes have can associated 'Render Layers' (found via the 'Spectre Layers' panel) which determine render properties such as texture, emissive-ness, and more."},
            {type: 'h3', text: tl('mode.start.format.resources')},
            {text: `* [Spectre Entity Docs](https://github.com/SpiritGameStudios/Spectre)
					* [Spectre GitHub](https://github.com/SpiritGameStudios/Spectre)`.replace(/\t+/g, '')
            }
        ]
    },
    codec: SPECTRE_CODEC,
    node_name_regex: "\\w.-",
    animation_mode: true,
    box_uv: true,
    box_uv_float_size: true,
    single_texture: true,
    bone_rig: true,
    centered_grid: true,
    rotate_cubes: true
})
SPECTRE_CODEC.format = SPECTRE_FORMAT;

export function unloadSpectreFormat(): void {
    SPECTRE_FORMAT.delete();
    SPECTRE_CODEC.delete();
}

export function isSpectreProject(): boolean {
    return Format == SPECTRE_FORMAT;
}