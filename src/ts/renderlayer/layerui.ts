// This file holds all functions related to Render Layer UI, including panel(s) and input dialogs
import {
    addRenderLayer,
    copyToRenderLayerData,
    getRenderLayerByUuid,
    RenderLayer,
    RenderLayerData,
    unselectAllRenderLayers
} from "./renderlayer";
import {getRenderLayersProperty, GROUP_RENDER_LAYER_UUID_PROPERTY_ID} from "../properties";
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

// This technically works and I think is the only feasible way of accomplishing what we want,
// but it's so cursed & fragile that I'm either going to try again later, or disregarding it completely
export function appendLayerNameLabelToGroups(): void {
    for (const group of Group.all) {
        // Delete previous label element by searching elements by id
        $(`#group_layer_label_${group.uuid}`).remove();

        // Skip if this group doesn't have a render layer, or if the render layer isn't found
        if (!group[GROUP_RENDER_LAYER_UUID_PROPERTY_ID]) continue;
        let renderLayer: RenderLayer = getRenderLayerByUuid(group[GROUP_RENDER_LAYER_UUID_PROPERTY_ID]);
        if (!renderLayer) continue;

        // Skip if the HTML element for this group can't be found
        let groupElement: HTMLElement = document.getElementById(group.uuid);
        if (!groupElement && !groupElement.children[0]) continue;

        // Find Group name input (yes it's an input and not a label or heading or anything else)
        let divElement: Element = groupElement.children[0];
        let inputElement: Element = divElement.getElementsByTagName("input")[0];

        // Create layer name label next to buttons
        let renderLayerLabel: HTMLLabelElement = document.createElement("label");
        renderLayerLabel.id = `group_layer_label_${group.uuid}`;
        renderLayerLabel.textContent = renderLayer.data.name;
        renderLayerLabel.style.color = "var(--color-subtle_text)";
        renderLayerLabel.style.marginRight = "8px";

        inputElement.insertAdjacentElement("afterend", renderLayerLabel);
    }
}

// Menu for creating a new Render Layer
export function addRenderLayerDialog(): void {
    let config: InputFormConfig = createRenderLayerFormConfig();

    let dialog: Dialog = new Dialog({
        id: "create-spectre-render-layer",
        title: "Create Render Layer",
        width: 610,
        form: config,
        onConfirm(formResult: any, event: Event): void | boolean {
            let data: RenderLayerData = copyToRenderLayerData(formResult);
            let layer: RenderLayer = new RenderLayer(data);
            addRenderLayer(layer);

            dialog.hide();
            Blockbench.showQuickMessage(`Created "${layer.data.name || "Layer"}"!`)
        }
    })
    dialog.show();
}

// Menu for editing an existing Render Layer
export function editRenderLayerDialog(layer: RenderLayer): void {
    let config: InputFormConfig = createRenderLayerFormConfig(layer.data);

    let dialog: Dialog = new Dialog({
        id: "edit-spectre-render-layer",
        title: `Edit ${layer.data.name}`,
        width: 610,
        form: config,
        onConfirm(formResult: any, event: Event): void | boolean {
            layer.data = copyToRenderLayerData(formResult, layer.data.uuid);

            dialog.hide();
            Blockbench.showQuickMessage(`Edited "${layer.data.name}"!`)
        }
    });
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
                return `${layer.data.typeId} - ${layer.data.textureId}`;
            },
            closeContextMenu(): void {
                // @ts-ignore
                if (Menu.open) Menu.open.hide();
            }
        },
        template: `
          <li
              v-bind:class="{ selected: layer.selected}"
              v-bind:layerid="layer.data.previewTexUuid"
              class="texture"
              @dblclick="layer.openEditMenu($event)"
              @click.stop="closeContextMenu();layer.select($event)"
          >
            <div class="texture_icon_wrapper">
              <img v-if="layer.hasTexture()"
                   v-bind:layerid="layer.data.uuid"
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
                      :key="layer.data.uuid" 
                      :layer="layer"
                    ></RenderLayer>
                  </ul>
                </div>
            `
        }
    })
}

// Input for creating AND editing a Render Layer
// layerData is intended to be a RenderLayerData object, but if no data is given, it defaults to an empty object
// If no data is given, a fallback/default value is used. Otherwise, it attempts to use the data's variable of such
function createRenderLayerFormConfig(layerData: RenderLayerData | any = {}): InputFormConfig {
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
            value: layerData.name || "",
            placeholder: layerData.name || "Layer"
        },
        typeId: {
            label: "Type Identifier",
            description: "The type identifier of this Render Layer. Register a custom LayerType with Spectre in your mod, or use a default one.",
            type: "text",
            value: layerData.typeId || "minecraft:entity",
            placeholder: layerData.typeId || "minecraft:entity",
        },
        textureId: {
            label: "Texture Identifier",
            description: "The Minecraft Identifier path for this layer's texture. This will be used when exported, but won't do much for previewing in Blockbench.",
            type: "text",
            value: layerData.textureId || "",
            placeholder: layerData.textureId || "minecraft:entity/zombie"
        },
        previewTexUuid: {
            label: "Blockbench Preview Texture",
            description: "The preview texture used in Blockbench. This texture won't be used when exported, only the texture identifier will be used.",
            type: "select",
            options: availableTextures,
            value: layerData.previewTexUuid ? layerData.previewTexUuid
                : Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
        }
    }
}