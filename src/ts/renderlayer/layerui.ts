// This file holds all functions related to Render Layer UI, including panel(s) and input dialog(s)
import {addRenderLayer, RenderLayer} from "./renderlayer";

let renderLayerPanel: Panel;

export function loadRenderLayerPanel(): void {
    // Spectre Layers panel
    renderLayerPanel = createRenderLayerPanel();
    updateInterfacePanels();
}

export function unloadRenderLayerPanel(): void {
    renderLayerPanel.delete();
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
            let renderLayer: RenderLayer = new RenderLayer({
                name: formResult.layerName || "Layer",
                type: formResult.layerType || "no_type",
                textureIdentifier: formResult.textureIdentifier || "minecraft:no_texture",
                previewTextureUuid: formResult.previewTextureIndex || Texture.getDefault().uuid
            });
            addRenderLayer(renderLayer);

            dialog.hide();
            Blockbench.showQuickMessage(`Created ${formResult.layerName || "Layer"} Render Layer!`)
        }
    })
    dialog.show();
}

function createRenderLayerPanel(): Panel {
    // @ts-expect-error - I don't know why my IDE is erroring Vue here, but it does work fine
    let renderLayerComponent = Vue.extend({
        props: {

        },
        methods: {

        },
        template: `
        `
    })

    return new Panel("render_layers", {
        icon: "fa-layer-group",
        name: "Spectre Layers",
        growable: true,
        resizable: true,
        condition: {
            // TODO - Spectre project type check here
            modes: ["edit", "paint"]
        },
        default_position: {
            slot: "left_bar",
            height: 400,
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
        form: new InputForm({}), // TODO - input form
        component: {
            name: "spectre-render-layers",
            data() { return {

            }},
            components: {
                "RenderLayer": renderLayerComponent
            },
            methods: {

            },
            template: `
                
            `
        }
    })
}

function createAddRenderLayerFormConfig(): InputFormConfig {
    // TODO - I'd love to have image previews of the textures here
    // Map<Texture UUID, Texture Name> - UUID is used for finding the texture, name is used for visual input from user
    let availableTextures: Record<string, string> = {}
    Texture.all.forEach(texture => {
        availableTextures[texture.uuid] = texture.name;
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
            placeholder: "layer",
        },
        layerType: {
            label: "Type",
            description: "The type of the layer",
            type: "text",
            value: "minecraft:entity",
            placeholder: "minecraft:entity",
        },
        textureIdentifier: {
            label: "Texture Identifier",
            description: "The Minecraft Identifier path for this layer's texture. This will be used when exported, but won't do much for previewing in Blockbench.",
            type: "text",
            placeholder: "minecraft:entity/zombie"
        },
        previewTextureIndex: {
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