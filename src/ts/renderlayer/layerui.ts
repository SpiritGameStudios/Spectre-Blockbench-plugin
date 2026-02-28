// This file holds all functions related to Render Layer UI, including panel(s) and input dialogs
import {
    addRenderLayer,
    copyToRenderLayerData,
    finishLayerUndo,
    getRenderLayerByUuid,
    initLayerUndo,
    moveSelectedRenderLayersToIndex,
    RenderLayer,
    RenderLayerData,
    unselectAllRenderLayers
} from "./renderlayer";
import {getRenderLayersProperty, GROUP_RENDER_LAYER_UUID_PROPERTY_ID} from "../properties";
import {SPECTRE_CODEC_FORMAT_ID} from "../format";

export const RENDER_LAYER_PANEL_ID: string = "render_layers_panel";

let renderLayerPanel: Panel;
let renderLayerContextMenu: Menu;

export function loadRenderLayerPanel(): void {
    // Spectre Layers panel
    renderLayerPanel = createRenderLayerPanel();

    // Right click Render Layer context menu
    renderLayerContextMenu = createRenderLayerContextMenu();

    // Ensure the Spectre Layers Panel stays up to date with Render Layer changes & Project switches
    // THIS EVENT IS SO IMPORTANT IT ISN'T EVEN FUNNY
    Blockbench.on("load_editor_state", updateRenderLayerPanel);
}

export function unloadRenderLayerPanel(): void {
    renderLayerPanel.delete();
    renderLayerContextMenu.delete();

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
            initLayerUndo({renderlayers: [layer]});
            layer.data = copyToRenderLayerData(formResult, layer.data.uuid);

            dialog.hide();
            Blockbench.showQuickMessage(`Edited "${layer.data.name}"!`)
            finishLayerUndo("Edit Render Layer");
        }
    });
    dialog.show();
}

export function openLayerContextMenu(layer: RenderLayer, event: MouseEvent): void {
    renderLayerContextMenu.open(event, layer);
}

function createRenderLayerContextMenu(): Menu {
    return new Menu([
        new MenuSeparator("manage"), "delete",
        new MenuSeparator("properties"), {
            icon: "list",
            name: "menu.texture.properties",
            click(layer: RenderLayer, event: MouseEvent): void {
                layer.openEditDialog(event)
            }
        },
    ])
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
            dragRenderLayer(initEvent: MouseEvent): void {
                if (initEvent.button == 1) return; // No middle click it seems
                if (getFocusedTextInput()) return;

                let layer: RenderLayer = this.layer;
                let active: Boolean = false;
                let helper: any; // Element for the box dragging indicator
                let vueScope: any = this;

                // Custom node methods for to prevent multiple usages of ts-expect-error every time they're needed
                function nodeWithinCursor(node: any, event: MouseEvent): boolean {
                    // @ts-expect-error
                    return isNodeUnderCursor(node, event);
                }
                function findCursorNode(node: any, event: MouseEvent): any {
                    // @ts-expect-error
                    return findNodeUnderCursor(node, event);
                }

                function mouseMove(dragEvent: MouseEvent): void {
                    // Require small drag distance before activating dragging behaviour to prevent accidental drags
                    let offsetX: number = dragEvent.clientX - initEvent.clientX;
                    let offsetY: number = dragEvent.clientY - initEvent.clientY;
                    if (!active) {
                        let dragDistance: number = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
                        active = dragDistance > 6; // I think this is literally like 6 pixels, very very small
                        layer.select(dragEvent, false); // Ensure selected because reordering relies on the layer being selected
                    }
                    if (!active) return;
                    if (dragEvent) dragEvent.preventDefault();

                    if (!helper) {
                        helper = vueScope.$el.cloneNode();
                        helper.classList.add("texture_drag_helper");
                        helper.setAttribute("layerid", layer.data.uuid);

                        document.body.append(helper);
                        Blockbench.addFlag("dragging_renderlayer");
                    }
                    helper.style.left = `${dragEvent.clientX}px`;
                    helper.style.top = `${dragEvent.clientY}px`;

                    // Drag - Remove drag blue line indicators
                    $(".outliner_node[order]").attr("order", null);
                    $(".drag_hover").removeClass("drag_hover");
                    $(".texture[order]").attr("order", null);

                    // TODO - Either visualize group which cube is in, or only visualize/allow groups
                    // Visualize which group the Render Layer would be applied to if dropped right then and there
                    if (nodeWithinCursor(document.getElementById("cubes_list"), dragEvent)) {
                        // @ts-expect-error - Unsure why this errors, but it works
                        for (let node of document.querySelectorAll(".outliner_object")) {
                            if (!nodeWithinCursor(node, dragEvent)) continue
                            let parent = node.parentNode;
                            parent.classList.add("drag_hover");
                            parent.setAttribute("order", 0);
                            return;
                        }
                    }

                    // Visualize placement of dragged Render Layer
                    if (nodeWithinCursor(document.querySelector("#render_layer_list"), dragEvent)) {
                        let targetRenderLayerElement = findCursorNode("#render_layer_list li.texture", dragEvent);
                        if (targetRenderLayerElement) {
                            let targetOffsetY: number = dragEvent.clientY - $(targetRenderLayerElement).offset().top;
                            targetRenderLayerElement.setAttribute("order", targetOffsetY > 24 ? "1" : "-1");
                            return;
                        }
                    }
                }

                // FIXME - Something is causing layers to be unselected on release if moved by only one layer
                function mouseRelease(releaseEvent: MouseEvent): void {
                    if (helper) helper.remove();
                    removeEventListeners(document, "mousemove", mouseMove);
                    removeEventListeners(document, "mouseup", mouseRelease);
                    releaseEvent.stopPropagation();

                    // Capture this before the "drag_hover" classes get removed within the following lines
                    let outlinerTargetNode: any = document.querySelector("#cubes_list li.outliner_node.drag_hover");

                    $(".outliner_node[order]").attr("order", null);
                    $(".drag_hover").removeClass("drag_hover");
                    $(".texture[order]").attr("order", null);

                    // @ts-expect-error - Menu.open isn't recognized for some reason
                    if (!active || Menu.open) return;

                    Blockbench.removeFlag("dragging_renderlayer");

                    // Handle moving (reordering) layers in the Spectre Layers Panel
                    if (nodeWithinCursor(document.getElementById("render_layer_list"), releaseEvent)) {
                        let targetIndex: number = getRenderLayersProperty().length - 1;
                        let targetRenderLayerElement: any = findCursorNode("#render_layer_list li.texture", releaseEvent);
                        let reverseRearrangeOrder: boolean = false;
                        if (targetRenderLayerElement) {
                            let layerUuid: string = targetRenderLayerElement.getAttribute("layerid");
                            let targetRenderLayer: RenderLayer = getRenderLayerByUuid(layerUuid);

                            targetIndex = getRenderLayersProperty().indexOf(targetRenderLayer);
                            let selfIndex: number = getRenderLayersProperty().indexOf(layer); // layer is this.layer
                            if (targetIndex == selfIndex) return;
                            if (selfIndex < targetIndex) {
                                targetIndex--;
                            } else {
                                reverseRearrangeOrder = true;
                            }

                            let offset: number = releaseEvent.clientY - $(targetRenderLayerElement).offset().top;
                            if (offset > 24) targetIndex++; // 24 is magic number from textures.js
                        }

                        initLayerUndo({renderlayer_order: true});
                        moveSelectedRenderLayersToIndex(targetIndex, reverseRearrangeOrder);
                        finishLayerUndo("Rearrange Render Layers");
                        updateInterfacePanels();
                    }

                    if (outlinerTargetNode) {
                        let uuid = outlinerTargetNode.id;
                        let target: OutlinerNode = OutlinerNode.uuids[uuid];

                        if (target.type === "group") {
                            target[GROUP_RENDER_LAYER_UUID_PROPERTY_ID] = layer.data.uuid;
                            Blockbench.showQuickMessage(`Applied ${layer.data.name} to ${target.name}!`);
                        } else {
                            // TODO - Still figure out how we want to handle applying to cubes
                            Blockbench.showQuickMessage("Cannot apply Render Layers to cubes! (Only Group Folders!)", 3000);
                        }
                    }
                }

                addEventListeners(document, "mousemove", mouseMove, {passive: false});
                addEventListeners(document, "mouseup", mouseRelease, {passive: false});
            },
            closeContextMenu(): void {
                // @ts-ignore
                if (Menu.open) Menu.open.hide();
            }
        },
        template: `
          <li
              v-bind:class="{ selected: layer.selected}"
              v-bind:layerid="layer.data.uuid"
              class="texture"
              @dblclick="layer.openEditDialog($event)"
              @click.stop="closeContextMenu();layer.select($event)"
              @mousedown.stop="dragRenderLayer($event)"
              @contextmenu.prevent.stop="layer.openContextMenu($event)"
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

    return new Panel(RENDER_LAYER_PANEL_ID, {
        icon: "fa-layer-group",
        name: "Spectre Layers",
        id: RENDER_LAYER_PANEL_ID,
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
            value: layerData.typeId || "spectre:entity",
            placeholder: layerData.typeId || "spectre:entity",
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
            description: "The preview texture used in Blockbench. This texture's width & length may be used in export, but the image itself will not be exported.",
            type: "select",
            options: availableTextures,
            value: layerData.previewTexUuid ? layerData.previewTexUuid
                : Texture.getDefault() ? Texture.getDefault().uuid : "no_texture"
        }
    }
}