import { HDNodeVoidWallet, HDNodeWallet } from 'ethers';
import Graphology from 'graphology';
import { Attributes } from 'graphology-types';
class TrieNode {
    children: { [key: string]: TrieNode };
    isEndOfWord: boolean;
    data: any; // Store data here

    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.data = null;
    }
}

class PathTrie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    insert(path: string, data: any): void {
        let node = this.root;
        const segments = path.split('/'); // Split the path into segments

        for (let segment of segments) {
            if (!node.children[segment]) {
                node.children[segment] = new TrieNode();
            }
            node = node.children[segment];
        }
        node.isEndOfWord = true;
        node.data = data; // Store the data at the leaf node
    }

    search(path: string): any {
        let node = this.root;
        const segments = path.split('/');

        for (let segment of segments) {
            if (!node.children[segment]) {
                return null; // Path not found
            }
            node = node.children[segment];
        }
        return node.isEndOfWord ? node.data : null; // Return data if path is valid
    }
}

// Patricia Trie for HDNode Path
class PatriciaTrieNode {
    key: string;
    isEndOfWord: boolean;
    data: any;
    children: PatriciaTrieNode[];

    constructor(key: string) {
        this.key = key;
        this.isEndOfWord = false;
        this.data = null;
        this.children = [];
    }
}

class EntityTrie {
    root: PatriciaTrieNode;

    constructor() {
        this.root = new PatriciaTrieNode("");
    }

    insert(path: string, data: any): void {
        let node = this.root;
        const segments = path.split('/');

        for (let segment of segments) {
            let found = false;
            for (let child of node.children) {
                if (child.key === segment) {
                    node = child;
                    found = true;
                    break;
                }
            }

            if (!found) {
                const newNode = new PatriciaTrieNode(segment);
                node.children.push(newNode);
                node = newNode;
            }
        }

        node.isEndOfWord = true;
        node.data = data; // Store the data at the leaf node
    }

    search(path: string): any {
        let node = this.root;
        const segments = path.split('/');

        for (let segment of segments) {
            let found = false;
            for (let child of node.children) {
                if (child.key === segment) {
                    node = child;
                    found = true;
                    break;
                }
            }

            if (!found) {
                return null; // Path not found
            }
        }

        return node.isEndOfWord ? node.data : null; // Return data if path is valid
    }
}
export default class ID {
    private wallet: HDNodeVoidWallet | HDNodeWallet;
    entities: Map<string, Set<string>> = new Map();
    pathTrie = new PathTrie();
    entityTrie = new EntityTrie();
    insert(name: string, data: Attributes) {
        const wallet = this.wallet.deriveChild(this.entities.size);
        const { path, address } = wallet
        if (!path) throw new Error("No Path check Wallet key");
        this.pathTrie.insert(name, `${path}/${address}`); // Store wallet path for name
        this.entityTrie.insert(`${path}/${address}`, data);
        this.entities.has(path) ? this.entities.set(path, new Set([address])) : this.entities.get(path)!.add(address);
        return `${path}/${address}`;
    };
    search(address: string) {
        const path = this.pathTrie.search(address); // m/44'/60'/0'/0/0
        return this.entityTrie.search(path)
    };
    export() {
        const graph = new Graphology()
        graph.setAttribute("extendedKey", this.wallet.extendedKey);
        graph.setAttribute("address", this.wallet.address);
        graph.setAttribute("index", this.wallet.index);
        graph.setAttribute("depth", this.wallet.depth);
        graph.setAttribute("path", this.wallet.path);
        this.entities.forEach((set, path) => {
            try {
                graph.addNode(path);
                set.forEach((address) => {
                    try {
                        graph.addNode(address, this.entityTrie.search(`${path}/${address}`));
                        graph.addEdge(path, address);
                    } catch (error) {
                        console.error(error)
                    }
                });
            } catch (error) {
                console.error(error);
            }
        });
        return graph.export();
    };
    constructor(extendedKey?: string) {
        this.wallet = extendedKey ? HDNodeWallet.fromExtendedKey(extendedKey) : HDNodeWallet.createRandom();
    }
}