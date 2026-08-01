import * as userRepository from "../../../src/modules/users/repositories/user.repository";

const buildUser = (email: string) => ({
  name: "Oliver Diaz",
  email,
  password: "secret123",
  role: "customer" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("user.repository (Mongo real)", () => {
  it("create hashea la contraseña (hook pre-save)", async () => {
    const user = await userRepository.create(buildUser("hash@example.com"));

    expect(user.password).not.toBe("secret123");
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  it("rechaza emails duplicados con error 11000 (unique index)", async () => {
    await userRepository.create(buildUser("dupe@example.com"));

    const error = await userRepository.create(buildUser("dupe@example.com")).catch((e: unknown) => e);
    expect(error).toBeDefined();
    expect((error as { name?: string; code?: number }).name).toBe("MongoServerError");
    expect((error as { code?: number }).code).toBe(11000);
  });

  it("findByEmail normaliza mayúsculas y espacios", async () => {
    const created = await userRepository.create(buildUser("Oliver@Example.com"));

    const found = await userRepository.findByEmail("  OLIVER@example.com  ");

    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe("oliver@example.com");
  });

  it("findAll y findById devuelven usuarios sin contraseña en el flujo público", async () => {
    const created = await userRepository.create(buildUser("list@example.com"));

    const all = await userRepository.findAll();
    expect(all.some((u) => u.id === created.id)).toBe(true);

    const found = await userRepository.findById(created.id);
    expect(found?.name).toBe("Oliver Diaz");
    expect(await userRepository.findById("invalid-id")).toBeNull();
  });

  it("updateById cambia nombre y re-hashea solo si cambia el password", async () => {
    const user = await userRepository.create(buildUser("update@example.com"));
    const originalHash = user.password;

    const renamed = await userRepository.updateById(user.id, { name: "Nuevo Nombre" });
    expect(renamed?.name).toBe("Nuevo Nombre");
    expect(renamed?.password).toBe(originalHash);

    const rehashed = await userRepository.updateById(user.id, { password: "otro-secreto" });
    expect(rehashed?.password).not.toBe(originalHash);
    expect(rehashed?.password).toMatch(/^\$2[aby]\$/);

    expect(await userRepository.updateById("invalid-id", { name: "X" })).toBeNull();
  });

  it("deleteById elimina el usuario y devuelve boolean", async () => {
    const user = await userRepository.create(buildUser("delete@example.com"));

    expect(await userRepository.deleteById(user.id)).toBe(true);
    expect(await userRepository.findById(user.id)).toBeNull();
    expect(await userRepository.deleteById("invalid-id")).toBe(false);
  });
});
