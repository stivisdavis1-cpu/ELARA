const url = "http://localhost:8080";
const adminUser = "admin";
const adminPassword = "admin";

async function getAdminToken() {
  const response = await fetch(`${url}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "admin-cli",
      username: adminUser,
      password: adminPassword,
      grant_type: "password"
    })
  });
  if (!response.ok) throw new Error(`Failed to get admin token: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function createRealm(token) {
  const response = await fetch(`${url}/admin/realms`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: "Elara",
      realm: "Elara",
      enabled: true,
      registrationAllowed: true
    })
  });
  if (response.status === 201) console.log("✅ Realm 'Elara' created.");
  else if (response.status === 409) console.log("⚠️ Realm 'Elara' already exists.");
  else throw new Error(`Failed to create realm: ${await response.text()}`);
}

async function createClient(token) {
  const response = await fetch(`${url}/admin/realms/Elara/clients`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      clientId: "elara-web",
      enabled: true,
      publicClient: false,
      secret: "elara-web-secret-123",
      redirectUris: ["http://localhost:3000/api/auth/callback/keycloak"],
      webOrigins: ["http://localhost:3000"],
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true
    })
  });
  if (response.status === 201) console.log("✅ Client 'elara-web' created.");
  else if (response.status === 409) console.log("⚠️ Client 'elara-web' already exists.");
  else throw new Error(`Failed to create client: ${await response.text()}`);
}

async function createUser(token, email, firstName, lastName) {
  // 1. Create user
  const response = await fetch(`${url}/admin/realms/Elara/users`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: email,
      email: email,
      firstName: firstName,
      lastName: lastName,
      enabled: true,
      emailVerified: true
    })
  });

  if (response.status === 409) {
    console.log(`⚠️ User '${email}' already exists.`);
    return;
  } else if (response.status !== 201) {
    throw new Error(`Failed to create user ${email}: ${await response.text()}`);
  }

  // 2. Get User ID
  const usersRes = await fetch(`${url}/admin/realms/Elara/users?username=${email}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const users = await usersRes.json();
  const userId = users[0].id;

  // 3. Set password
  const passRes = await fetch(`${url}/admin/realms/Elara/users/${userId}/reset-password`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "password",
      value: "admin",
      temporary: false
    })
  });

  if (!passRes.ok) {
    throw new Error(`Failed to set password for ${email}: ${await passRes.text()}`);
  }

  console.log(`✅ User '${email}' created with password 'admin'.`);
}

async function main() {
  try {
    console.log("Fetching admin token...");
    const token = await getAdminToken();

    console.log("Configuring Keycloak...");
    await createRealm(token);
    await createClient(token);

    console.log("Creating users...");
    await createUser(token, "admin-free@elara.test", "Startup", "L'Aurore");
    await createUser(token, "admin-pro@elara.test", "Cabinet", "Pro Consulting");
    await createUser(token, "admin-enterprise@elara.test", "Holding", "Internationale");

    console.log("🎉 Keycloak initialization complete!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();
