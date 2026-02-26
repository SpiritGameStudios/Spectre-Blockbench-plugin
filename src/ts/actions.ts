import {isSpectreProject, SPECTRE_CODEC, SPECTRE_CODEC_FORMAT_ID} from "./format";
import {addRenderLayerDialog, RENDER_LAYER_PANEL_ID} from "./renderlayer/layerui";
import {getRenderLayersProperty, GROUP_RENDER_LAYER_UUID_PROPERTY_ID} from "./properties";
import {deleteSelectedRenderLayers, RenderLayer} from "./renderlayer/renderlayer";

export const EXPORT_SPECTRE_ACTION_ID: string = "export-to-spectre-button";

export const CREATE_RENDER_LAYER_ACTION_ID: string = "create-spectre-render-layer";
export const DELETE_RENDER_LAYER_ACTION_ID: string = "delete-spectre-render-layer";
export const APPLY_GROUP_RENDER_LAYER_ACTION_ID: string = "group-apply-spectre-layer";

let spectreActions: Array<Action> = [];

export function loadSpectreActions(): void {
    createSpectreAction(EXPORT_SPECTRE_ACTION_ID, {
        name: "Export Spectre Model",
        icon: "resize",
        condition: () => isSpectreProject(),
        click(): void {
            SPECTRE_CODEC.export();
        }
    }, "file.export.0");

    createSpectreAction(CREATE_RENDER_LAYER_ACTION_ID, {
        name: "Create Render Layer",
        icon: "icon-create_bitmap",
        condition: () => isSpectreProject(),
        click(): void {
            addRenderLayerDialog();
        }
    });

    SharedActions.add("delete", {
        subject: "render_layer",
        condition: () => isSpectreProject() && Prop.active_panel == RENDER_LAYER_PANEL_ID,
        run(): void {
            deleteSelectedRenderLayers();
        }
    })

    // createSpectreAction(DELETE_RENDER_LAYER_ACTION_ID, {
    //     name: "Delete Selected Render Layer(s)",
    //     icon: "delete",
    //     keybind: "delete",
    //     condition: () => isSpectreProject(),
    //     click(): void {
    //         deleteSelectedRenderLayers();
    //     }
    // })

    // Menu Item to apply Render Layers to Groups by right-clicking them
    Group.prototype.menu.addAction(createSpectreAction(APPLY_GROUP_RENDER_LAYER_ACTION_ID, {
        name: "Render Layer",
        icon: "icon-create_bitmap",
        condition: {
            formats: [SPECTRE_CODEC_FORMAT_ID],
            modes: ["edit", "paint"]
        },
        // FIXME - This doesn't really work well, unsure why yet
        // @ts-expect-error
        children(context: Group) {
            function applyRenderLayer(layer: RenderLayer, group: Group): void {
                group[GROUP_RENDER_LAYER_UUID_PROPERTY_ID] = layer.data.uuid;
            }

            let layers: Array<any> = [{
                icon: "crop_square",
                name: "Default Layer",
                click(group: Group): void {

                }
            }];

            for (const layer of getRenderLayersProperty()) {
                layers.push({
                    name: layer.data.name,
                    icon: layer.hasTexture() ? layer.getTexture().img : "imagesmode",
                    marked: layer.data.uuid == context[GROUP_RENDER_LAYER_UUID_PROPERTY_ID], // Underline current layer
                    click(group: Group): void {
                        applyRenderLayer(layer, group);
                    }
                })
            }

            return layers;
        },
        click(group): void {
            console.log(group);
        }
    }), Group.prototype.menu.structure.indexOf("move_to_group") + 1); // Apply after Move To (Group) button
}

export function unloadSpectreActions(): void {
    for (const action of spectreActions) {
        action.delete();
    }
}

function createSpectreAction(id: string, options: ActionOptions, categoryPath?: string): Action {
    let action: Action = new Action(id, options);
    registerSpectreAction(action, categoryPath);
    return action;
}

function registerSpectreAction(action: Action, categoryPath?: string): void {
    MenuBar.addAction(action, categoryPath);
    spectreActions.push(action);
}