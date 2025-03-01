import mqtt, { MqttClient } from 'mqtt';
import { HDNodeWallet } from 'ethers';
import ID from './id';
import { readFileSync, writeFileSync } from 'fs';
let wallet = HDNodeWallet.fromPhrase("fun dwarf until ghost ahead biology toilet gym obvious copper clarify pool");
const client: MqttClient = mqtt.connect({
    servers: [
        { host: "marketplace2d", port: 3883, protocol: "ws" },
        { host: "127.0.0.1", port: 3883, protocol: "ws" },
        { host: "test.mosquitto.org", port: 8080, protocol: "ws" },
    ]
});
const id = new ID();
let previousState = readFileSync("id.json", "utf-8") ?? "";
client.on("connect", async () => {
    console.log({ wallet, id, client: client.options.clientId }, "Mosquitto Auto-update service started");
    await client.subscribeAsync(wallet.extendedKey + "/+");
    while (client.connected) {
        process.stdout.write(".")
        const state = JSON.stringify(id.export(),undefined,2);
        // const state = JSON.stringify({ entities: id.entityTrie.root, paths: id.pathTrie.root });
        if (state !== previousState) {  // Only send when data changes
            try {
                process.stdout.write("!")
                previousState = state;
                client.publishAsync(wallet.extendedKey, state);
                writeFileSync("id.json", state);
            } catch (error) {
                console.error(error)
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Short delay to avoid blocking
    }
});
client.on("message", (topic, payload) => {
    try {
        console.error(topic, payload.toString());
        id.insert(topic, payload);
    } catch (error) {
        console.error(error);
    }
});
