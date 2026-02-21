import {isSpectreProject, SPECTRE_CODEC, SPECTRE_CODEC_FORMAT_ID} from "./format";
import {addRenderLayerDialog} from "./renderlayer/layerui";
import {getRenderLayersProperty, GROUP_RENDER_LAYER_UUID_PROPERTY_ID} from "./properties";

export const EXPORT_SPECTRE_ACTION_ID: string = "export-to-spectre-button";

export const CREATE_RENDER_LAYER_ACTION_ID: string = "create-spectre-render-layer";
export const APPLY_GROUP_RENDER_LAYER_ACTION_ID: string = "group-apply-spectre-layer";

let spectreActions: Array<Action> = [];

export function loadSpectreActions(): void {
    createSpectreAction(EXPORT_SPECTRE_ACTION_ID, {
        name: "Export Spectre Model",
        icon: "resize",
        condition: () => isSpectreProject(),
        click() {
            SPECTRE_CODEC.export();
        }
    }, "file.export");

    createSpectreAction(CREATE_RENDER_LAYER_ACTION_ID, {
        name: "Create Render Layer",
        icon: "icon-create_bitmap",
        condition: () => isSpectreProject(),
        click() {
            addRenderLayerDialog();
        }
    });

    // TODO - finish this tomorrow, I want to play Splatoon for the rest of tonight
    Group.prototype.menu.addAction(createSpectreAction(APPLY_GROUP_RENDER_LAYER_ACTION_ID, {
        name: "Render Layer",
        icon: "icon-create_bitmap",
        condition: {
            formats: [SPECTRE_CODEC_FORMAT_ID],
            modes: ["edit", "paint"]
        },
        children() {
            let layers: Array<any> = [{
                icon: "crop_square",
                name: "Default Layer",
                click(group) {
                    console.log(group);
                }
            }];

            for (const layer of getRenderLayersProperty()) {
                layers.push({
                    name: layer.data.name,
                    icon: "imagesmode",
                    click(group: Group) {
                        group[GROUP_RENDER_LAYER_UUID_PROPERTY_ID] = layer.data.uuid;
                    }
                })
            }

            return layers;
        },
        click(group) {
            console.log(group);
        }
    }), 6);
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