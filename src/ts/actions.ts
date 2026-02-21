import {isSpectreProject, SPECTRE_CODEC} from "./format";
import {addRenderLayerDialog} from "./renderlayer/layerui";

export const EXPORT_SPECTRE_ACTION_ID: string = "export-to-spectre-button";

export const CREATE_RENDER_LAYER_ACTION_ID: string = "create-spectre-render-layer";

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