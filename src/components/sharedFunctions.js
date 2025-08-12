export const getHeaderForPart = (localPart) => {
    if (!localPart) {
        return 'Part Details';
    }

    let partHeader = localPart.name;
    if (localPart.mpn) {
        partHeader = partHeader.replace("Part ", "");
        partHeader += `: ${localPart.mpn}`;
        if (localPart.quantity) {
            partHeader += ` (${localPart.quantity})`
        }
        if (localPart.manufacturer) {
            partHeader += ` [${localPart.manufacturer}]`
        }
    }
    return partHeader || localPart.partName || localPart.name || 'Part Details';
  };

