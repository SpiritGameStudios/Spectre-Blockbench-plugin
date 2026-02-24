import {getRenderLayersProperty, GROUP_RENDER_LAYER_UUID_PROPERTY_ID} from "./properties";
import {getRenderLayerByUuid} from "./renderlayer/renderlayer";

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
    cubes: Array<CubeExport>
    children?: Array<BoneExport>
}

export interface CubeExport {
    name: string, // Duplicates allowed
    from: ArrayVector3,
    to: ArrayVector3,
    uv: ArrayVector2 // Box UV offset
}

// Codec handles everything related to the file - compiling & exporting, parsing & importing, etc.
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

            // Note: This is determined by the type later
            if(layer.data.textureId) layerExport.texture = layer.data.textureId;
            if(layer.hasTexture()) {
                let texture: Texture = layer.getTexture();
                layerExport.texture_size = [texture.width, texture.height];
            }
            layersExport.push(layerExport);
        }

        const bonesExport: Array<BoneExport> = [];
        for (const group of Group.all) {
            if (!group.export) continue;
            if (group.parent != "root") continue; // Compile only root bones here
            bonesExport.push(compileBone(group));
        }

        const spectreExport: SpectreExportFormat = {
            author: Settings.get("username") ? Settings.get("username").toString() : undefined,
            version: "0.0.1",
            layers: layersExport,
            bones: bonesExport
        }

        return compileJSON(spectreExport);
    }
})

// Format tells Blockbench how to handle the models - Box UV or Face UV, allow rotating cubes, allowed mesh names, etc.
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
SPECTRE_CODEC.format = SPECTRE_FORMAT; // Tell the codec to use our Format, I imagine for direct imports of our models

export function unloadSpectreFormat(): void {
    SPECTRE_FORMAT.delete();
    SPECTRE_CODEC.delete();
}

export function isSpectreProject(): boolean {
    return Format == SPECTRE_FORMAT;
}

function compileBone(group: Group): BoneExport {
    let layerUuid: string = group[GROUP_RENDER_LAYER_UUID_PROPERTY_ID];
    let layerName: string = getRenderLayerByUuid(layerUuid) ? getRenderLayerByUuid(layerUuid).data.name : "null";

    let origin: ArrayVector3 = structuredClone(group.origin);
    if (group.parent instanceof Group) { // Subtract parent's origin
        origin.V3_subtract(group.parent.origin)
    }
    origin[0] *= -1; // Flip X
    origin[1] *= -1; // Flip Y
    if (!(group.parent instanceof Group)) {
        origin[1] += 24;
    }

    let rotation: ArrayVector3 = structuredClone(group.rotation);
    rotation[0] *= -1; // Flip X;
    rotation[1] *= -1; // Flip Y

    // group.children[] contains both cubes & groups
    let cubes: Array<CubeExport> = [];
    let children: Array<BoneExport> = [];
    for (const child of group.children) {
        if (child instanceof Group) {
            children.push(compileBone(child));
        } else if (child instanceof Cube) {
            cubes.push(compileCube(child));
        }
    }

    return {
        name: group.name,
        layer: layerName,
        pivot: origin,
        rotation: rotation,
        cubes: cubes,
        children: children.length != 0 ? children : undefined
    }
}

function compileCube(cube: Cube): CubeExport {
    return {
        name: cube.name,
        from: cube.from,
        to: cube.to,
        uv: cube.uv_offset
    }
}