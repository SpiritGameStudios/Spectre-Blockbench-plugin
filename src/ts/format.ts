import {CUBE_RENDER_LAYER_UUID_PROPERTY_ID, getRenderLayersProperty} from "./properties";
import {addRenderLayer, getRenderLayerByUuid, RenderLayer, RenderLayerData} from "./renderlayer/renderlayer";

export const SPECTRE_CODEC_FORMAT_ID: string = "spectre_entity";

// TODO - Default to null layer, either list of preset buttons or button for presets (dropdown like mesh?)
export interface SpectreExportFormat {
    author?: string,
    version: string,
    layers?: Record<string, RenderLayerExport>, // Map<LayerName, LayerData>
    bones?: Array<BoneExport>
}

export interface RenderLayerExport {
    name: string,
    type: string,
    [data: string]: any
}

export interface BoneExport {
    name: string, // Duplicates allowed
    pivot: ArrayVector3,
    rotation: ArrayVector3,
    cubes: Array<CubeExport>
    children?: Array<BoneExport>
}

export interface CubeExport {
    name: string, // Duplicates allowed
    layer: string,
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
    // @ts-expect-error - Unsure why FileResult can't be found but okay
    load(model: any, file: FileResult, args?: LoadOptions): void {
        let importIntoCurrentProject: boolean = args ? args.import_to_current_project : false;
        if (!importIntoCurrentProject) {
            setupProject(SPECTRE_FORMAT);
        }

        let appProjectSetup: boolean = file.path && isApp && this.remember && !file.no_file;

        // Setup Project info
        if (appProjectSetup) {
            Project.name = pathToName(file.path, false);
            Project.export_path = file.path;
            Project.export_codec = SPECTRE_CODEC_FORMAT_ID;
        }

        // Parse JSON into Blockbench data
        this.parse(model, file.path, args);

        // Handle extras
        if (appProjectSetup) {
            // if (isApp) {
            //     let noTexturesBefore: boolean = Texture.all.length == 0;
            //     loadDataFromModelMemory();
            //     if (!Format.single_texture && noTexturesBefore && Texture.all.length) {
            //         Cube.all.forEach(cube => {
            //             cube.applyTexture(Texture.all[0], true);
            //         });
            //     }
            // }
            //
            addRecentProject({
                name, // Borrowed from Blockbench's bedrock format, not a clue what's going on here
                path: file.path,
                icon: Format.icon
            });

            let project: ModelProject = Project;
            setTimeout(() => {
                if (Project == project) setTimeout(() => updateRecentProjectThumbnail(), 40);
            }, 200);
        }

    },
    parse(data: SpectreExportFormat, path: string, args?: LoadOptions): void {
        // Map<Layer ID, Layer UUID>
        let layerMap: Record<string, string> = {};

        let textureSizeSet: boolean = false;

        if (data.layers) {
            for (let layerId in data.layers) {
                let layerExport: RenderLayerExport = data.layers[layerId];
                let renderLayer: RenderLayer = parseRenderLayer(layerExport);
                layerMap[layerId] = renderLayer.data.uuid; // data.uuid is set in Render Layer constructor
                addRenderLayer(renderLayer, false);

                // Set texture size from first layer for now, but use default layer later
                if (!textureSizeSet && layerExport.texture_size) {
                    Project.texture_width = layerExport.texture_size[0];
                    Project.texture_height = layerExport.texture_size[0];
                    textureSizeSet = true;
                }
            }
        }

        if (data.bones) {
            for (let bone of data.bones) {
                parseBone(layerMap, bone);
            }
        }

        // I don't know what these do but they make the silly thing work so yay
        Canvas.updateAllBones();
        // @ts-expect-error
        setProjectTitle();
        Validator.validate();
        updateSelection();
    },
    // Note: the order of which fields are added to objects are the same order they're outputted in JSON
    compile(options?: any): any {
        const layersMapExport: Record<string, RenderLayerExport> = {};
        for (const layer of getRenderLayersProperty()) {
            layersMapExport[layer.getIdentifier()] = compileRenderLayer(layer);
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
            layers: layersMapExport,
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

function parseRenderLayer(layerExport: RenderLayerExport): RenderLayer {
    let data: RenderLayerData = {
        name: layerExport.name || "Render Layer",
        type: layerExport.type || "no_type",
        typeId: layerExport.type || "no_type",
        textureId: layerExport.texture || undefined,
    }

    return new RenderLayer(data);
}

function parseBone(layerMap: Record<string, string>, boneExport: BoneExport, parentGroup?: Group): void {
    let group: Group = new Group({
        name: boneExport.name,
        origin: boneExport.pivot,
        rotation: boneExport.rotation,
        color: Group.all.length % markerColors.length
    }).init();

    group.rotation[1] *= -1; // Unflip Y
    group.rotation[0] *= -1; // Unflip X
    if (!(parentGroup)) {
        group.origin[1] -= 24;
    }

    group.origin[1] *= -1;
    group.origin[0] *= -1;

    if (parentGroup) { // Unsubtract parent's origin
        group.origin.V3_add(parentGroup.origin);
    }

    // Add Bones/Groups before Cubes, because their order isn't stored in export
    if (boneExport.children) {
        for (const childExport of boneExport.children) {
            parseBone(layerMap, childExport, group);
        }
    }

    if (boneExport.cubes) {
        for (const cubeExport of boneExport.cubes) {
            parseCube(layerMap, cubeExport, group);
        }
    }

    if (parentGroup) {
        group.addTo(parentGroup);
    }
}

function parseCube(layerMap: Record<string, string>, cubeExport: CubeExport, parentGroup: Group): void {
    let cube: Cube = new Cube({
        name: cubeExport.name || parentGroup.name,
        autouv: 0,
        color: parentGroup.color,
        from: cubeExport.from,
        to: cubeExport.to,
        uv_offset: cubeExport.uv
    });

    let layerUuid: string = layerMap[cubeExport.layer];
    if (layerUuid) {
        cube[CUBE_RENDER_LAYER_UUID_PROPERTY_ID] = layerUuid;
    }

    cube.addTo(parentGroup).init();
}

function compileRenderLayer(layer: RenderLayer): RenderLayerExport {
    const layerExport: RenderLayerExport = {
        name: layer.data.name,
        type: layer.data.typeId
    }

    // Note: This is determined by the type later
    if(layer.data.textureId) layerExport.texture = layer.data.textureId;
    if(layer.hasTexture()) {
        let texture: Texture = layer.getTexture();
        layerExport.texture_size = [texture.width, texture.height];
    }

    return layerExport;
}

function compileBone(group: Group): BoneExport {
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
        pivot: origin,
        rotation: rotation,
        cubes: cubes,
        children: children.length != 0 ? children : undefined
    }
}

function compileCube(cube: Cube): CubeExport {
    let layerUuid: string = cube[CUBE_RENDER_LAYER_UUID_PROPERTY_ID];
    let layer: RenderLayer = getRenderLayerByUuid(layerUuid);
    let layerId: string = layer ? layer.getIdentifier() : "null";

    return {
        name: cube.name,
        layer: layerId,
        from: cube.from,
        to: cube.to,
        uv: cube.uv_offset
    }
}