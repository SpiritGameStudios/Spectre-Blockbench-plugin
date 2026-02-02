let menuItems: { action: Action, menuCategory: string }[];

function load() {
    menuItems = [
        {
            action: new Action("export-to-spectre-button", {
                click() {
                    //this returns quite a lot of metadata about all textures
                    let textures = Project?.textures ?? [];
                    //loop over them and extract the "width" and "height", and "img":"tex":"name" properties
                    let properties = [];
                    for (const texture of textures) {
                        properties.push({
                            texture: texture.img.tex.name, // same format as block textures
                            texture_size: [ // technically more like a ratio than a size but making it the actual ratio (eg, 1:1 for square) would lead to floating point precision issues
                                texture.width,
                                texture.height
                            ]
                        });
                    }
                    const json = JSON.stringify({ properties }, null, 2);
                    Blockbench.export({
                        type: 'Spectre Model',
                        extensions: ['json'],
                        name: `${Project?.name ?? "unnamed"}.json`,
                        content: json
                    });
                },

                icon: "S",
                name: "Export Spectre Model"
            }),
            menuCategory: "file.export"
        }
    ]

    for (const menuItem of menuItems) {
        MenuBar.addAction(menuItem.action, menuItem.menuCategory)
    }
}

function unload() {
    for (const menuItem of menuItems) {
        menuItem.action.delete()
    }
}

BBPlugin.register(
    'export_to_spectre', {
    title: 'Export to Spectre',
    author: 'Kilip1000 & CallMeEcho',
    description: 'Export your project as a Spectre json.',
    icon: '../icon.png',
    creation_date: '2025-02-01',
    version: '2.0.0',
    variant: 'desktop',
    min_version: '4.12.4',
    has_changelog: false,
    tags: ['Exporter'],
    repository: '',
    onload: load,
    onunload: unload
});
