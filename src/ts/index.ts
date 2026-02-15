import {addRenderLayerDialog, loadRenderLayers, unloadRenderLayers} from "./renderlayer";
import {loadSpectreProperties, unloadSpectreProperties} from "./properties";
import {SPECTRE_CODEC, unloadSpectreFormat} from "./format";

let menuItems: { action: Action, menuCategory: string }[];

function load() {
    loadSpectreProperties()
    loadRenderLayers();

    menuItems = [
        {
            action: new Action("export-to-spectre-button", {
                click() {
                    SPECTRE_CODEC.export();
                },
                icon: "resize",
                name: "Export Spectre Model"
            }),
            menuCategory: "file.export"
        },
        {
            action: new Action("create-spectre-render-layer", {
                click() {
                    addRenderLayerDialog();
                },
                icon: "icon-create_bitmap",
                name: "Create Render Layer"
            }),
            menuCategory: "file.view"
        }
    ]

    for (const menuItem of menuItems) {
        MenuBar.addAction(menuItem.action, menuItem.menuCategory)
    }
}

function unload() {
    unloadRenderLayers();
    unloadSpectreProperties();
    unloadSpectreFormat();

    for (const menuItem of menuItems) {
        menuItem.action.delete()
    }
}

BBPlugin.register(
    'export_to_spectre', {
    title: 'Export to Spectre',
    author: 'Kilip1000 & CallMeEcho',
    description: 'Export your project as a Spectre json.',
    // NOTE: This move back directory needs to be removed when the built js file isn't inside the `dist` folder
    // Also: about.md also seems messed up because of this directory thing, it should fix itself when this is changed
    icon: '../icon.png',
    creation_date: '2025-02-01',
    version: '2.0.0',
    variant: 'desktop',
    min_version: '4.12.4',
    has_changelog: false,
    tags: ['Minecraft: Java Edition', 'Exporter'],
    repository: '',
    onload: load,
    onunload: unload
});
