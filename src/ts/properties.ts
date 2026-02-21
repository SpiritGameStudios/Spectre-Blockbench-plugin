import {RenderLayer} from "./renderlayer/renderlayer";
import {isSpectreProject} from "./format";

export const RENDER_LAYERS_PROPERTY_ID: string = "spectre_project_render_layers";

export function getRenderLayersProperty(): Array<RenderLayer> {
    return Project[RENDER_LAYERS_PROPERTY_ID] || [];
}

let spectreProperties: Property<any>[] = [];

export function loadSpectreProperties(): void {
    registerSpectreProperty(new RenderLayerProperty(RENDER_LAYERS_PROPERTY_ID, {
        label: "Spectre Render Layers",
        exposed: false,
        export: true,
        condition: isSpectreProject()
    }));
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
            let layer: RenderLayer = new RenderLayer({
                name: layerData.name || "Layer",
                typeIdentifier: layerData.typeIdentifier || "no_type",
                textureIdentifier: layerData.textureIdentifier || "no_texture",
                previewTextureUuid: layerData.previewTextureUuid
            });
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
