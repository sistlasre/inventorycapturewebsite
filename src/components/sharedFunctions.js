export const getHeaderForPart = (localPart) => {
    if (!localPart) {
        return 'Part Details';
    }

    let partHeader = localPart.name;
    const mpn = localPart.manualContent?.mpn || localPart.generatedContent?.mpn || localPart.mpn;
    if (mpn) {
        partHeader = partHeader.replace("Part ", "");
        partHeader += `: ${mpn}`;
        const quantity = localPart.manualContent?.quantity || localPart.generatedContent?.quantity || localPart.quantity;
        if (quantity) {
            partHeader += ` (${quantity})`
        }
        const manufacturer = localPart.manualContent?.manufacturer || localPart.generatedContent?.manufacturer || localPart.manufacturer;
        if (manufacturer) {
            partHeader += ` [${manufacturer}]`
        }
    }
    return partHeader || localPart.partName || localPart.name || 'Part Details';
  };

