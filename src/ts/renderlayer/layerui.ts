// This file holds all functions related to Render Layer UI, including panel(s) and input dialog(s)
import {addRenderLayer, RenderLayer, unselectAllRenderLayers} from "./renderlayer";
import {getRenderLayersProperty} from "../properties";
import {SPECTRE_CODEC_FORMAT_ID} from "../format";

let renderLayerPanel: Panel;

export function loadRenderLayerPanel(): void {
    // Spectre Layers panel
    renderLayerPanel = createRenderLayerPanel();

    // Ensure the Spectre Layers Panel stays up to date with Render Layer changes & Project switches
    // THIS EVENT IS SO IMPORTANT IT ISN'T EVEN FUNNY
    Blockbench.on("load_editor_state", updateRenderLayerPanel);
}

export function unloadRenderLayerPanel(): void {
    renderLayerPanel.delete();

    Blockbench.removeListener("load_editor_state", updateRenderLayerPanel);
}

function updateRenderLayerPanel(): void {
    renderLayerPanel.inside_vue.renderlayers = getRenderLayersProperty();
}

export function addRenderLayerDialog(): void {
    let config: InputFormConfig = createAddRenderLayerFormConfig();

    let dialog: Dialog = new Dialog({
        id: "create_spectre_render_layer",
        title: "Create Render Layer",
        width: 610,
        form: config,
        onConfirm(formResult: any, event: Event): void | boolean {
            // If "No Texture" was selected, set to undefined,
            // otherwise attempt the selected texture, then attempt Project default texture, and fallback to undefined
            let textureUuid: string = formResult.previewTextureUuid == "no_texture" ? undefined
                : formResult.previewTextureUuid || Texture.getDefault().uuid || undefined

            // Note: Defaults here need to be synced with defaults in properties.ts
            let renderLayer: RenderLayer = new RenderLayer({
                name: formResult.layerName || "Layer",
                typeIdentifier: formResult.layerType || "no_type",
                textureIdentifier: formResult.textureIdentifier || "no_texture",
                previewTextureUuid: textureUuid
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
            layer: RenderLayer
        },
        methods: {
            getLayerDescription(layer: RenderLayer): string {
                return `${layer.data.typeIdentifier} - ${layer.data.textureIdentifier}`;
            },
            closeContextMenu(): void {
                // @ts-ignore
                if (Menu.open) Menu.open.hide();
            }
        },
        template: `
            <li
                v-bind:class="{ selected: layer.selected}"
                v-bind:layerid="layer.data.previewTextureUuid"
                class="texture"
                @click.stop="closeContextMenu();layer.select($event)"
            >
              <div class="texture_icon_wrapper">
                <img v-if="layer.hasTexture()"
                    v-bind:layerid="layer.data.name"
                    v-bind:src="layer.getTextureSource()"
                    class="texture_icon"
                    width="48px"
                    alt=""
                />
                <i v-else 
                   class="material-icons"
                   style="max-width:48px;font-size:48px"
                >
                  imagesmode
                </i>
              </div>
              <div class="texture_description_wrapper">
                <div class="texture_name">{{ layer.data.name }}</div>
                <div class="texture_res">{{ getLayerDescription(layer) }}</div>
              </div>
            </li>
        `
    })

    return new Panel("render_layers", {
        icon: "fa-layer-group",
        name: "Spectre Layers",
        id: "render_layers",
        growable: true,
        resizable: true,
        condition: {
            formats: [SPECTRE_CODEC_FORMAT_ID],
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
            new Toolbar("spectre_layer_toolbar", {
                name: "Spectre Layers Toolbar",
                id: "spectre_layer_toolbar",
                children: [
                    "create-spectre-render-layer"
                    // "+", // Everything after this will appear to the right of the bar instead of the left
                    // "export-to-spectre-button" // I think this is causing the toolbar to not load right away
                ]
            })
        ],
        component: {
            data() { return {
                renderlayers: getRenderLayersProperty()
            }},
            components: {
                "RenderLayer": renderLayerComponent
            },
            methods: {
                openMenu(event: MouseEvent): void {
                    renderLayerPanel.menu.show(event);
                },
                getRenderLayers() {
                    return this.renderlayers;
                },
                unselectAllLayers(): void {
                    unselectAllRenderLayers();
                }
            },
            template: `
                <div>
                  <ul id="render_layer_list" class="list mobile_scrollbar" @contextmenu.stop.prevent="openMenu($event)" @click.stop="unselectAllLayers()">
                    <RenderLayer
                      v-for="layer in getRenderLayers()"
                      :key="layer.data.previewTextureUuid" 
                      :layer="layer"
                    ></RenderLayer>
                  </ul>
                </div>
            `
        }
    })
}

function createAddRenderLayerFormConfig(): InputFormConfig {
    // TODO - I'd love to have image previews of the textures here
    // Map<Texture UUID, Texture Name> - UUID is used for finding the texture, name is used for visual input from user
    let availableTextures: Record<string, string> = {}
    availableTextures["no_texture"] = "No Texture";
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
            placeholder: "Layer",
        },
        layerType: {
            label: "Type Identifier",
            description: "The type identifier of this Render Layer. Register a custom LayerType with Spectre in your mod, or use a default one.",
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
        previewTextureUuid: {
            label: "Blockbench Preview Texture",
            description: "The preview texture used in Blockbench. This texture won't be used when exported, only the texture identifier will be used.",
            type: "select",
            options: availableTextures,
            value: Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
        },

        propertiesWhitespace: { label: "", text: "", type: "info" },
        properties: {
            label: "Render Layer Properties",
            text: "",
            type: "info",
        }
    }
}