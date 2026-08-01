let counter = 0;

export const uniqueTestIp = (): string => {
  counter += 1;
  return `10.0.0.${counter}`;
};
