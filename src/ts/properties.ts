import {copyToRenderLayerData, RenderLayer, RenderLayerData} from "./renderlayer/renderlayer";
import {isSpectreProject} from "./format";

export const PROJECT_RENDER_LAYERS_PROPERTY_ID: string = "spectre_render_layers";
export const GROUP_RENDER_LAYER_UUID_PROPERTY_ID: string = "spectre_layer_uuid";

export function getRenderLayersProperty(): Array<RenderLayer> {
    return Project[PROJECT_RENDER_LAYERS_PROPERTY_ID] || [];
}

let spectreProperties: Property<any>[] = [];

export function loadSpectreProperties(): void {
    registerSpectreProperty(new RenderLayerProperty(PROJECT_RENDER_LAYERS_PROPERTY_ID, {
        label: "Spectre Render Layers",
        exposed: false,
        export: true,
        condition: isSpectreProject()
    }));

    let availableRenderLayers: Record<string, string> = {}
    availableRenderLayers["default_layer"] = "Default Layer";
    getRenderLayersProperty().forEach((layer: RenderLayer) => {
        availableRenderLayers[layer.data.uuid] = layer.data.name;
    })

    createSpectreProperty(Group, "string", GROUP_RENDER_LAYER_UUID_PROPERTY_ID, {
        label: "Spectre Render Layer UUID",
        exposed: false,
        export: true,
        condition: isSpectreProject(),
        inputs: {
            element_panel: {
                input: {
                    label: "Render Layer",
                    description: "This group's Render Layer",
                    type: "select",
                    options: availableRenderLayers
                }
            }
        }
    });
}

export function unloadSpectreProperties(): void {
    for (const property of spectreProperties) {
        property.delete();
    }
}

function createSpectreProperty<T extends keyof IPropertyType>(targetClass: any, type: T, name: string, options?: PropertyOptions): Property<T> {
    let property: Property<T> = new Property(targetClass, type, name, options);
    return registerSpectreProperty(property);
}

function registerSpectreProperty(property: Property<any>): Property<any> {
    spectreProperties.push(property);
    return property;
}

// Custom Property class to allow for extra control of compilation and parsing of RenderLayer data.
// Each RenderLayer's RenderLayerData is saved to the .bbmodel file, instead of the full RenderLayer object.
// Upon parsing, each parsed RenderLayerData is given to a new RenderLayer for use while Blockbench is open.
class RenderLayerProperty extends Property<"array"> {
    constructor(name: string, options?: PropertyOptions) {
        super(ModelProject, "array", name, options);
    }

    // Method for reading the property from .bbmodel file
    merge(instance: IPropertyType["array"], data: IPropertyType["array"]): void {
        if (data[this.name] == undefined) return;
        if (!(data[this.name] instanceof Array)) return;

        // Ensure active instance of this property is an array instead of some other object type
        if (!(instance[this.name] instanceof Array)) {
            instance[this.name] = [];
        }

        // Parse each RenderLayerData and convert them into active RenderLayer objects for the instance
        // Note: Defaults here need to be synced with defaults in layerui.ts
        for (const layerData of data[this.name]) {
            let data: RenderLayerData = copyToRenderLayerData(layerData);
            let layer: RenderLayer = new RenderLayer(data);
            instance[this.name].push(layer);
        }
    }

    // Method for writing the property to exported .bbmodel file
    copy(instance: IPropertyType["array"], target: IPropertyType["array"]): void {
        try {
            // Ensure written object is an array instead of some other object type
            if (!(target[this.name] instanceof Array)) {
                target[this.name] = [];
            }

            for (const item of instance[this.name]) {
                const i = instance[this.name].indexOf(item);
                if (typeof item != "object") continue
                // I don't know why parsing a stringified copy is done, but it works
                target[this.name][i] = JSON.parse(JSON.stringify(item.getSaveCopy()));
            }
        } catch (err) {
            console.error(err);
        }
    }
}
