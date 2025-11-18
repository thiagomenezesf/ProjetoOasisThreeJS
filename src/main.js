import * as THREE from "three"; //bliblioteca principal three
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"; //importação de controle de câmera para girar ao redor de um ponto (visão livre)
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"; //importação para utilizar primeira pessoa (captura o cursor, movimento tipo FPS)
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"; //loader para importar modelos .obj
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; //loader para importar modelos .glb/.gltf.
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

// Criando a cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); //definindo o fundo (céu azul claro)

// Criando a renderização
const renderer = new THREE.WebGLRenderer({ antialias: true }); //antialaias true suaviza os serrilhados
renderer.setSize(window.innerWidth, window.innerHeight); //definindo a resolução do canvas
renderer.shadowMap.enabled = true; //permite as sombras
renderer.shadowMap.type = THREE.BasicShadowMap;//tipo da sombra sendo definido, essas sombras são mais básicas (para ser mais leve no PC)
document.body.appendChild(renderer.domElement);//adicionando o canvas ("tela") ao body do html

// Criando a câmera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);//câmera perspectiva, como se fosse um olho humano (fov, aspect, near, far)
camera.position.set(-20, 15, 10);//posição inicial da camera

// Criando Orbit Controls
const orbit = new OrbitControls(camera, renderer.domElement);//permite arrastar com o mouse em volta da cena 
orbit.enableDamping = true;//deixa o movimento mais suavizado (menos brusco)
orbit.enabled = true;//controla se o orbit responde (permite o movimento)

// Criando Pointer Lock FPS
const pointerControls = new PointerLockControls(camera, renderer.domElement);//captura o cursor e permite olhar ao redor mexendo o mouse no modo FPS (em primeira pessoa)
let usingFPS = false;//flag para saber se está em primeira pessoa ou não.

document.getElementById("btn-toggle-fps").addEventListener("click", () => {
  if (!usingFPS) pointerControls.lock();
});//quando clica no botão “Entrar em 1ª pessoa” chama o pointerControls.lock(), que dispara o evento lock (bloqueia o cursor do mouse)

document.getElementById("btn-toggle-orbit").addEventListener("click", () => {
  pointerControls.unlock();//desbloqueia o ponteiro do mouse quando clica em "Visão livre"
  usingFPS = false;//garante que o usingFPS fica falso
  orbit.enabled = true; //reativa o orbit para poder girar a tela segurando o cursor do mouse normalmente
});

//Aplica o lock ao pointerControls
pointerControls.addEventListener("lock", () => {
  usingFPS = true;//deixa o usingFPS true para mostrar que está no modo primeira pessoa
  orbit.enabled = false;//desabilita o orbit
  orbit.enableDamping = false;//desabilita o damping
});

//Aplica o unlock ao pointerControls
pointerControls.addEventListener("unlock", () => {
  usingFPS = false;////deixa o usingFPS false para mostrar que está no modo visão livre
  orbit.enabled = true;//habilita o orbit
  orbit.enableDamping = true;//habilita o damping
});

//Cria a iluminação
scene.add(new THREE.AmbientLight(0xffffff, 0.4));//adiciona a iluminação à cena. O AmbientLight ilumina de maneira uniforme (evita sombras completamente pretas)

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);//luz direcional que simula o sol com direção e projeção de sombras
dirLight.position.set(50, 80, -30);//setando a posição da luz
dirLight.castShadow = true;//ativa as sombras
dirLight.shadow.mapSize.set(128, 128);//qualidade das sombras, quanto maior melhor a qualidade, mas mais pesado
scene.add(dirLight);//adiciona na cena

const warm = new THREE.PointLight(0xffe6b3, 0.6, 25);//lâmpada pontual, como se fosse um poste (tonalidade, intensidade, alcance)
warm.position.set(-10, 0.5, -8);//posição da lâmpada
warm.castShadow = true;//habilita as sombras
scene.add(warm);//adiciona na cena

// Cira o Terreno
const TERRAIN_SIZE = 250;//define o tamanho do terreno
const segments = 50;//define o número de segmentos. cada segmento é como se fosse uma face, quanto mais, mais detalhado
const groundGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);//cria a geometria inicial do chão, paralalela ao eixo XY
groundGeo.rotateX(-Math.PI / 2);//rotaciona o plano para ficar paralelo ao eixo XZ

for (let i = 0; i < groundGeo.attributes.position.count; i++) {// loop que vai iterar sobre cada vértice na geometria do plano. groundGeo.attributes.position.count é o número total de pontos ((segments + 1) * (segments + 1) = 71 * 71 = 5041 pontos)
  const x = groundGeo.attributes.position.getX(i);//pega as coordenadas x do vértice atual (i).
  const z = groundGeo.attributes.position.getZ(i);//pega as coordenadas y do vértice atual (i).
  const height =//cria a altura
    Math.sin(x * 0.02) * 4 + Math.cos(z * 0.02) * 3 + (Math.random() - 0.5) * 0.8;//vai criar ondas no relevo (como se fossem dunas) ao longo dos eixos x e y
  groundGeo.attributes.position.setY(i, height);//seta a altura (y) de cada vértice (i), criando as colinas e vales
}
groundGeo.computeVertexNormals();//recalcula as normais dos vertices corretamente para o three.js. depois de mover todos os vertices, elas ficaram incorretas. é importante para a iluminação e as sombras ficarem corretas e suaves no terreno

//Cria Textura e material do chão
const loader = new THREE.TextureLoader();//loader para carregar a textura
const grassTex = loader.load("/assets/textures/grass_diffuse.jpg");//carregando a textura da grama
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;//faz com que a imagem (o quadradinho) da textura se repita pelo terreno, e não estique para cobrir o mapa
grassTex.repeat.set(40, 40);//define quantas vezes vai repetir na horizontal e vertical (x,y)

const groundMat = new THREE.MeshStandardMaterial({//permite colocar e configurar a textura no mapa, reagindo à luz de forma realista e baseada na física (PBR)
  map: grassTex,//coloca a textura no mapa
  roughness: 1.0,//define a rugosidade
});

const ground = new THREE.Mesh(groundGeo, groundMat);//une a geometria com a textura da grama
ground.receiveShadow = true;//habilita o objeto para receber sombras projetadas dos outros
scene.add(ground);//adiciona a mistura na cena
ground.position.setY(0)

// Cria a água
//const waterGeo = new THREE.PlaneGeometry(30, 30);//cria o plano geométrico da água
const waterMat = new THREE.MeshStandardMaterial({//cria o material da água
  color: 0x2a8bd8,//define a cor de azul oceano
  transparent: true,//habilita transparência
  opacity: 0.55,//opacidade
  roughness: 0.6,//rugosidade
})

const waterGeo = new THREE.PlaneGeometry(55, 43, 10, 10);//cria a geometria da água
waterGeo.rotateX(-Math.PI / 2);//rotaciona para ela ficar paralela ao eixo XZ

const water = new THREE.Mesh(waterGeo, waterMat);//une a geometria com a textura da água

water.position.set(-35, 0, 20);//seta a posição do plano da água
water.receiveShadow = true;//permite que a água receba as sombras
scene.add(water);//adiciona na cena

// Cria o loader genérico para carregar objetos (OBJ) com textura (MTL)
function loadOBJcomMTL(objUrl, mtlUrl, pos = { x: 0, y: 0, z: 0 }, scale = 1) {//passa como parâmetros o url do objeto, o url da textura, a posição e a escala do obj
  const mtlLoader = new MTLLoader();//o mtl loader vai ser utilizado para carregar a textura MTL do objeto OBJ
  mtlLoader.load(mtlUrl, (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();//instancia o loader
    objLoader.setMaterials(materials);
    objLoader.load(//inicia o carregamento do arquivo pela url. Aceita três funções de retorno de chamada (callbacks): (url, onLoad, onProgress, onError)
      objUrl,
      (obj) => {//função anônima com o obj como argumento
        obj.traverse((c) => {//traverse percorre recursivamente todos os objetos filhos dentro do modelo principal
          if (c.isMesh) {//verifica se é uma malha renderizável
            c.castShadow = true;//habilita projetar sombra
            c.receiveShadow = true;//habilita que outros objetos projetem sobra sobre ele
          }
        });
        obj.rotation.x = -Math.PI / 2;//rotaciona 90 graus porque o objeto vem vertical, paralelo ao plano XY
        obj.position.set(pos.x, pos.y, pos.z);//seta a posição do onjeto, com base nos parãmetros fornecidos na função
        obj.scale.setScalar(scale);//seta escala uniforme do objeto, com base nos parãmetros fornecidos na função. Ex: setScalar(1) define x, y e z como 1.
        obj.userData = { info: "Modelo OBJ carregado" };//utilizado para informar e identificar o objeto
        scene.add(obj);//adiciona à cena
      },
      undefined,
      (err) => console.error("ERRO OBJ:", err)//caso ocorra erro
    );
  });
}

// Carregar um macaco
loadOBJcomMTL("/assets/models/macaco.obj", '/assets/models/macaco.mtl', { x: -25, y: 1, z: -3 }, 0.03);

// Cria a função GLTF
function loadGLTF(path, pos = { x: 0, y: 0, z: 0 }, scale = 1, nome) {//função para carregar os arquivos GLTF ou GLB, com parâmetros url (path), coordenadas e a escala do objeto
  const gltfLoader = new GLTFLoader();//instancia o loader
  gltfLoader.load(//inicia o carregamento assíncrono (significa que o sistema não para pra receber os dados) de um arquivo
    path,//url
    (gltf) => {//função anônima para quando o arquivo é carregado com sucesso - callback de sucesso (onLoad)
      const obj = gltf.scene;//obtém o objeto que quer adicionar na cena
      obj.traverse((child) => {//o traverse percorre todas as sub-partes do modelo (por ex: folhas, tronco, galhos) para aplicar as configurações a todas elas
        if (child.isMesh) {//se for uma malha renderizavel
          child.castShadow = true;//permite projetar sombras
          child.receiveShadow = true;//permite receber sombras
        }
      });

      obj.position.set(pos.x, pos.y, pos.z);//seta a posição
      obj.scale.set(scale, scale, scale);//seta a escala
      obj.userData = { info: nome };
      scene.add(obj);//adiciona o objeto na cena
    },
    undefined,
    (e) => console.error("Erro GLTF:", e)//imprime mensagem de erro se não dá pra carregar o arquivo - callback de erro (onError)
  );
}

//Palmeira
loadGLTF("/assets/models/tree_palmTall.glb", { x: -20, y: 0, z: -10 }, 11);
loadGLTF("/assets/models/tree_palmTall.glb", { x: -65, y: 0, z: -10 }, 9, "Arvore");
loadGLTF("/assets/models/tree_palmTall.glb", { x: -60, y: 0, z: 40 }, 12);
loadGLTF("/assets/models/tree_palmTall.glb", { x: -30, y: 0, z: 43 }, 8);
loadGLTF("/assets/models/tree_palmTall.glb", { x: -40, y: 0, z: 0 }, 10);

//Canoa
loadGLTF("/assets/models/canoe.glb", { x: -40, y: 1, z: 20 }, 7);

//Pedra
loadGLTF("/assets/models/path_stoneEnd.glb", { x: -45, y: 1, z: 5 }, 10);

//ponte de madeira
loadGLTF("/assets/models/path_wood.glb", { x: -40, y: 1, z: 20 }, 20);

//fogueira
loadGLTF("/assets/models/campfire_planks.glb", { x: -26, y: 2, z: 0 }, 10);

//cacto
loadGLTF("/assets/models/cactus_tall.glb", { x: -20, y: 1.2, z: 30 }, 7);
loadGLTF("/assets/models/cactus_tall.glb", { x: -10, y: 2, z: -5 }, 8);

//tenda
loadGLTF("/assets/models/tent.glb", { x: 0, y: 7, z: 23 }, 0.05);

// Criando o movimento FPS
const move = { f: false, b: false, l: false, r: false };//objeto utilizado para verificar se as teclas estão pressionadas. f = frente, b = trás, l = esquerda, r = direita. vão ficar true quando forem apertadas
const vel = new THREE.Vector3();//vetor para armazenar a velocidade atual de movimento
const dir = new THREE.Vector3();//vetor para armazenar a direção normalizada do movimento (aponta pra onde ir)
const SPEED = 15;//define a velocidade maxima de movimento

document.addEventListener("keydown", (e) => {//evento para quando a tecla é pressionada. realiza o callback sempre que isso ocorre. 
  if (e.code === "KeyW") move.f = true;//seta o movimento (move) de cada uma para true se for a tecla correspondente a ser pressionada
  if (e.code === "KeyS") move.b = true;
  if (e.code === "KeyA") move.l = true;
  if (e.code === "KeyD") move.r = true;
});
document.addEventListener("keyup", (e) => {//evento para quando a tecla é solta. realiza o callback sempre que isso ocorre. 
  if (e.code === "KeyW") move.f = false;//seta o movimento (move) de cada uma para false se for a tecla correspondente a ser solta
  if (e.code === "KeyS") move.b = false;
  if (e.code === "KeyA") move.l = false;
  if (e.code === "KeyD") move.r = false;
});

// Redimensionando a tela
window.addEventListener("resize", () => {//adiciona um evento à janela do navegador para redimensionar a tela sempre que o usuário arrasta o canto da janela
  camera.aspect = window.innerWidth / window.innerHeight;//define o aspect como a largura da tela dividido pela altura. serve para a cena não esticar ou espremer quando a janela muda de forma
  camera.updateProjectionMatrix();//atualiza a matriz de projeção. sempre que o aspect muda deve ser atualizada para recalcular como os objetos devem ser projetados na tela com a nova proporção
  renderer.setSize(window.innerWidth, window.innerHeight);//redimensiona o tamanho da tela no renderizador
});

// Criando o Loop
let prev = performance.now();//obtém timestamp atual no início de cada novo quadro (tempo desde que a página foi carregada). serve para medir a diferença de tempo (dt) entre um quadro e outro


function animate() {//função principal do loop
  requestAnimationFrame(animate);//função que faz com que chame o animate() novamente sempre que aparecer um novo quadro para ser "pintado"

  const now = performance.now();//obtém o timestamp atual no início de cada quadro novo
  const dt = (now - prev) / 1000;//calcula o tempo delta (dt), sendo o tempo decorrido entre o quadro anterior (prev) e o quadro atual (now) e convertido em milissegundos

  if (usingFPS) {//se for FPS (primeira pessoa)
    dir.set(Number(move.r) - Number(move.l), 0, Number(move.f) - Number(move.b));//seta a direção que ele vai andar. converte o valor booleano do moove para 0 ou 1. se o r for true, o dir.x = 1. se o l for true, o dir.x = -1. o mesmo vale para o eixo z
    if (dir.length() > 0) dir.normalize();//se alguma tecla ou mais estiver pressionada (length > 0), ele normaliza o vetor dir para que mesmo se andar em duas direções a velocidade seja a mesma

    vel.x -= vel.x * 3 * dt;//subtrai gradualmente a velocidade do x, para tornar o movimento mais natural
    vel.z -= vel.z * 3 * dt;//subtrai gradualmente a velocidade do z, para tornar o movimento mais natural

    vel.x += dir.x * SPEED * dt;//calcula um pequeno impulso do eixo x na direção que o usuário está apertando no teclado, baseado na velocidade máxima (SPEED)
    vel.z += dir.z * SPEED * dt;//calcula um pequeno impulso do eixo z na direção que o usuário está apertando no teclado, baseado na velocidade máxima (SPEED)

    pointerControls.moveRight(vel.x * dt);//pega a distancia (velocidade x tempo) e move para frente e para trás a câmera na direção que ela está olhando, com base na rotação do mouse
    pointerControls.moveForward(vel.z * dt);//pega a distancia (velocidade x tempo) e move para a direita e para a esquerda a câmera na direção que ela está olhando, com base na rotação do mouse

    // Trava o y da câmera
    camera.position.y = 4.5;//altura fixa do jogador
  } else {
    orbit.update();//atualiza o orbit
  }

  renderer.render(scene, camera);//renderiza com base na cena e na camera
  prev = now;//atualiza o prev com o valor atual do timestamp
}
animate();
