// Main Render Layer class which holds information about each layer
import {getRenderLayersProperty} from "../properties";

export class RenderLayer {
    uuid: string;
    id: string
    name: string

    constructor(name: string) {
        this.name = name;
    }
}

let renderLayerPanel: Panel;

export function loadRenderLayerPanel(): void {
    renderLayerPanel = createRenderLayerPanel();
}

export function unloadRenderLayerPanel(): void {
    renderLayerPanel.delete();
}

export function createNewRenderLayer(): void {
    let renderLayer: RenderLayer = new RenderLayer("hiya");

    let projectRenderLayers: Array<RenderLayer> = getRenderLayersProperty();
    if (projectRenderLayers != undefined) {
        projectRenderLayers.push(renderLayer);
    }
}

function createRenderLayerPanel(): Panel {
    return new Panel("render_layers", {
        icon: "image",
        name: "Render Layers",
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