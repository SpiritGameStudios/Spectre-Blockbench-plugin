import {loadRenderLayers, unloadRenderLayers} from "./renderlayer/renderlayer";
import {loadSpectreProperties, unloadSpectreProperties} from "./properties";
import {unloadSpectreFormat} from "./format";
import {loadSpectreActions, unloadSpectreActions} from "./actions";

function load(): void {
    loadSpectreProperties()
    loadRenderLayers();
    loadSpectreActions();
}

function unload(): void {
    unloadRenderLayers();
    unloadSpectreProperties();
    unloadSpectreActions();

    unloadSpectreFormat();
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
    // NOTE: I've changed this to "both" to test on the web app to see if any issues are cache issues or not
    variant: 'both',
    min_version: '4.12.4',
    has_changelog: false,
    tags: ['Minecraft: Java Edition', 'Exporter'],
    repository: '',
    onload: load,
    onunload: unload
});
