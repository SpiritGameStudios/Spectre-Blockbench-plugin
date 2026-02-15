import {RenderLayer} from "./renderlayer";

export const RENDER_LAYERS_PROPERTY_ID: string = "spectre_project_render_layers";

export function getRenderLayersProperty(): Array<RenderLayer> {
    return Project[RENDER_LAYERS_PROPERTY_ID] || [];
}



let spectreProperties: Property<any>[] = [];

export function loadSpectreProperties(): void {
    createSpectreProperty(ModelProject, "array", RENDER_LAYERS_PROPERTY_ID, {
        label: "Spectre Render Layers",
        exposed: false,
        copy_value: true,
        export: true,
        merge(instance: any, data: any): void {
            if (!data[RENDER_LAYERS_PROPERTY_ID]) return;
            for (let layer of data[RENDER_LAYERS_PROPERTY_ID]) {
                let parsedLayer: RenderLayer = new RenderLayer(
                    `${layer.name}_parsed`,
                    layer.type,
                    layer.textureIdentifier,
                    layer.previewTextureUuid
                );
                instance[RENDER_LAYERS_PROPERTY_ID].push(parsedLayer);
            }
        }
    });

    createDeepClonedSpectreProperty(ModelProject,  "freakingpleaseworkgoshdangit2", {
        label: "SO MUCH WHIMSY AND MAGIC",
        exposed: false,
        default: new RenderLayer("Layer 1", "minecraft:entity", "minecraft:not_found", "0")
    })
    Project["freakingpleaseworkgoshdangit2"] = new RenderLayer("Layer 2", "minecraft:entity", "minecraft:not_found", "0");
}

export function unloadSpectreProperties(): void {
    for (const property of spectreProperties) {
        property.delete();
    }
}

function createSpectreProperty<T extends keyof IPropertyType>(targetClass: any, type: T, name: string, options?: PropertyOptions): Property<T> {
    let property: Property<T> = new Property(targetClass, type, name, options);
    spectreProperties.push(property);
    return property;
}

function createDeepClonedSpectreProperty(targetClass: any, name: string, options?: PropertyOptions) {
    let property: DeepClonedObjectProperty = new DeepClonedObjectProperty(targetClass, name, options);
    spectreProperties.push(property);
    return property;
}

class DeepClonedObjectProperty extends Property<'object'> {
    constructor(targetClass: any, name: string, options?: PropertyOptions) {
        super(targetClass, 'object', name, options)
    }
    getDefault(instance: IPropertyType["object"]): IPropertyType["object"] {
        return this.default;
    }
    merge(instance: any, data: any) {
        instance[this.name] = data[this.name];
    }
    copy(instance: any, target: any) {
        target[this.name] = instance[this.name];
    }
}