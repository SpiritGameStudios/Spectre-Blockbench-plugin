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
import {CUBE_RENDER_LAYER_UUID_PROPERTY_ID, getRenderLayersProperty} from "../properties";
import {SPECTRE_CODEC_FORMAT_ID} from "../format";
import {DEFAULT_RENDER_LAYER_PRESET, RENDER_LAYER_PRESETS, RenderLayerPreset} from "./layerpresets";

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

export interface RenderLayerDialogOptions {
    formResults?: any; // For copying the value from previously opened dialogs from changing the Layer Type
    preservedFormResults?: any;
    prevTypePresetId?: string;
    editingLayer?: RenderLayer, // For editing a Render Layer
}

// Menu for creating AND editing a new Render Layer
// Oh, Kat, you mismatched cash piano I'll TEAR YOU TO *PIECES* ~Blockbench at how cursed this whole thing is, probably
export function addRenderLayerDialog(options: RenderLayerDialogOptions = {}): void {
    let dialogTitle: string = options.editingLayer ? `Edit ${options.editingLayer.data.name}` : "Create New Render Layer";
    let config: InputFormConfig = createRenderLayerFormConfig(options);

    let dialog: Dialog = new Dialog({
        id: "create-edit-spectre-render-layer",
        title: dialogTitle,
        width: 610,
        form: config,
        onFormChange(formResult: { [p: string]: FormResultValue }) {
            if (!formResult.typePreset) return;
            // Preserve values from other preset types
            if (!options.preservedFormResults) {
                options.preservedFormResults = {};
            }
            // Copy updated values over to preserved list
            for (let entry in formResult) {
                options.preservedFormResults[entry] = formResult[entry];
            }
            // Copy lost values over to formResults
            for (let entry in options.preservedFormResults) {
                if (formResult[entry]) continue;
                formResult[entry] = options.preservedFormResults[entry];
            }

            // @ts-expect-error
            let selectedTypePresetId: string = formResult.typePreset;
            if (selectedTypePresetId != options.prevTypePresetId) {
                dialog.close();
                addRenderLayerDialog({
                    formResults: formResult,
                    preservedFormResults: options.preservedFormResults,
                    prevTypePresetId: selectedTypePresetId,
                    editingLayer: options.editingLayer
                })
            }
        },
        onConfirm(formResult: any, event: Event): void | boolean {
            let message: string;
            // Setup type id for copyToRenderLayerData to use
            if (!formResult.typeId) {
                formResult.typeId = RENDER_LAYER_PRESETS[formResult.typePreset].id;
            }

            if (options.editingLayer) { // Edit layer
                let layer: RenderLayer = options.editingLayer;
                initLayerUndo({renderlayers: [layer]});

                layer.data = copyToRenderLayerData(formResult, layer.data.uuid);

                message = `Edited "${layer.data.name}"!`;
                finishLayerUndo("Edit Render Layer");
            } else { // Create layer
                let data: RenderLayerData = copyToRenderLayerData(formResult);
                let layer: RenderLayer = new RenderLayer(data);
                addRenderLayer(layer);

                message = `Created "${layer.data.name || "Layer"}"!`;
            }

            dialog.hide();
            Blockbench.showQuickMessage(message);
        }
    })
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

                        if (target.type === "cube") {
                            target[CUBE_RENDER_LAYER_UUID_PROPERTY_ID] = layer.data.uuid;
                            Blockbench.showQuickMessage(`Applied ${layer.data.name} to ${target.name}!`);
                        } else {
                            Blockbench.showQuickMessage("Render Layers can only be applied to Cubes!", 3000);
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
// function createRenderLayerFormConfig(layerData: RenderLayerData | any = {}): InputFormConfig {
function createRenderLayerFormConfig(dialogOptions: RenderLayerDialogOptions): InputFormConfig {
    // Map<PresetRecordId, PresetName>
    let availableTypePresets: Record<string, string> = {};
    for (let presetId in RENDER_LAYER_PRESETS) {
        let preset: RenderLayerPreset = RENDER_LAYER_PRESETS[presetId];
        availableTypePresets[presetId] = preset.name;
    }

    let formResults: any = dialogOptions.formResults || {};
    let layerData: RenderLayerData | any = dialogOptions.editingLayer ? dialogOptions.editingLayer.data : {};

    let config: InputFormConfig = {
        info: {
            label: "Render Layer Info",
            text: "",
            type: "info",
        },
        layerName: {
            label: "generic.name",
            description: "The name of this Render Layer. Converted to an ID for linking bones/cubes to layers, and used as given for debugging.",
            type: "text",
            value: formResults.layerName || layerData.name || "",
            placeholder: layerData.name || "Layer"
        },
        typePreset: {
            label: "Layer Type",
            description: "The type of this Render Layer.",
            type: "select",
            options: availableTypePresets,
            value: formResults.typePreset || layerData.type || DEFAULT_RENDER_LAYER_PRESET
        },
        typeId: {
            label: "Type Identifier",
            description: "The type identifier of this Render Layer. Register a custom LayerType with Spectre in your mod, or use a default one.",
            type: "text",
            toggle_enabled: true,
            toggle_default: formResults.typeId || layerData.typeId || false, // Enable if a custom id has been entered
            value: formResults.typeId,
            placeholder: formResults.typePreset ? RENDER_LAYER_PRESETS[formResults.typePreset].id : layerData.typeId || "spectre:entity",
        },
        typeFieldBreak: "_",
        typeFieldInfo: {
            label: "Layer Type Fields",
            text: "",
            type: "info"
        }
    }

    let appendedTypePreset: RenderLayerPreset = formResults.typePreset ? RENDER_LAYER_PRESETS[formResults.typePreset] : RENDER_LAYER_PRESETS[DEFAULT_RENDER_LAYER_PRESET];
    let appendedConfig: InputFormConfig = appendedTypePreset.config(dialogOptions);

    for (let entry in appendedConfig) {
        // Append type config entries to config
        config[entry] = appendedConfig[entry];
    }

    return config;
}