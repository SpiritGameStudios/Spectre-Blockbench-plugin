import {getRenderLayersProperty} from "../properties";

// Main Render Layer class which holds information about each layer
export class RenderLayer {
    name: string;
    textureId: string;

    id: string;

    constructor(name: string, textureId: string = "minecraft:not_found") {
        this.name = name;
        this.textureId = textureId;
    }
}



let renderLayerPanel: Panel;

export function loadRenderLayerPanel(): void {
    renderLayerPanel = createRenderLayerPanel();
}

export function unloadRenderLayerPanel(): void {
    renderLayerPanel.delete();
}

function addRenderLayer(renderLayer: RenderLayer): void {
    let projectRenderLayers: Array<RenderLayer> = getRenderLayersProperty();
    if (projectRenderLayers != undefined) {
        projectRenderLayers.push(renderLayer);
    }
}

export function addRenderLayerDialog(): void {
    let config: InputFormConfig = createAddRenderLayerFormConfig();

    let dialog: Dialog = new Dialog({
        id: "create_spectre_render_layer",
        title: "Create Render Layer",
        width: 610,
        form: config,
        onConfirm(formResult: any, event: Event): void | boolean {
            // TODO - Warning for if any results are missing
            let renderLayer: RenderLayer = new RenderLayer(formResult.layerName, formResult.textureId);
            addRenderLayer(renderLayer);

            dialog.hide();
        }
    })
    dialog.show();
}

function createRenderLayerPanel(): Panel {
    return new Panel("render_layers", {
        icon: "fa-layer-group",
        name: "Spectre Layers",
        condition: {
            method: () => !(Blockbench.isMobile) // TODO - Spectre project type check here
        },
        min_height: 300,
        default_position: {
            slot: "left_bar",
            float_position: [0, 0],
            float_size: [300, 400],
            attached_to: "textures",
            attached_index: 1,
            sidebar_index: 2
        },
        toolbars: [
            new Toolbar("render_layer_list", {
                children: [
                    "create-spectre-render-layer",
                    "+", // Everything after this will appear to the right of the bar instead of the left
                    "export-to-spectre-button"
                ]
            })
        ],
        form: new InputForm({}) // TODO - input form
    })
}

function createAddRenderLayerFormConfig(): InputFormConfig {
    // TODO - I'd love to have image previews of the textures here
    let availableTextures: Record<string, string> = {}
    Texture.all.forEach(texture => {
        availableTextures[texture.id] = texture.name;
    })

    return {
        info: {
            label: "Render Layer Info",
            text: "",
            type: "info",
        },
        layerName: {
            label: "generic.name",
            description: "The name of this Render Layer. Converted to an ID for linking bones/cubes to layers, and used as given for debugging.",
            type: "text",
            value: "layer",
            placeholder: "layer",
        },
        textureIdentifier: {
            label: "Texture Identifier",
            description: "The Minecraft Identifier path for this layer's texture. This will be used when exported, but won't do much for previewing in Blockbench.",
            type: "text",
            placeholder: "minecraft:entity/zombie"
        },
        previewTexture: {
            label: "Blockbench Preview Texture",
            description: "The preview texture used in Blockbench. This texture won't be used when exported, only the texture identifier will be used.",
            type: "select",
            options: availableTextures
        },

        propertiesWhitespace: { label: "", text: "", type: "info" },
        properties: {
            label: "Render Layer Properties",
            text: "",
            type: "info",
        }
    }
}