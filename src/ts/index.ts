import {loadRenderLayers, unloadRenderLayers} from "./renderlayer/renderlayer";
import {loadSpectreProperties, unloadSpectreProperties} from "./properties";
import {SPECTRE_CODEC, unloadSpectreFormat} from "./format";
import {addRenderLayerDialog} from "./renderlayer/layerui";

let menuItems: { action: Action, menuCategory: string }[];
let testPanel: Panel;

function load() {
    loadSpectreProperties()
    loadRenderLayers();

    testPanel = new Panel("test_panel", {
        name: "Test Panel",
        icon: "explosion",
        growable: true,
        resizable: true,
        condition: {
            modes: ['edit', 'paint']
        },
        default_position: {
            slot: "left_bar",
            float_position: [0, 0],
            float_size: [300, 400],
            height: 400
        },
        component: {
            data() { return {
                textures: Texture.all,
            }},
            methods: {
                getAllTextures(): Texture[] {
                    return this.textures;
                },
                getEntryName(texture: Texture): string {
                    return `${texture.name} - ${texture.selected}`;
                }
            },
            template: `
                <div>
                  <ul id="texture_list" class="list mobile_scrollbar">
                    <li v-for="texture in getAllTextures()">{{ getEntryName(texture) }}</li>
                  </ul>
                </div>
            `
        },
    });

    Blockbench.on("load_editor_state", () => {
        // Update panel's textures variable when switching Project tabs (and seemingly with Texture.all changes too?)
        testPanel.inside_vue.textures = Texture.all;
    })

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
    testPanel.delete();

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
    variant: 'both',
    min_version: '4.12.4',
    has_changelog: false,
    tags: ['Minecraft: Java Edition', 'Exporter'],
    repository: '',
    onload: load,
    onunload: unload
});
