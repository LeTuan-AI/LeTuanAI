
import { GoogleGenAI, Type } from "@google/genai";
import { getAiClient } from "./keyService";
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character } from "../types";

const RULE_19_INSTRUCTION = "Bạn là một chuyên gia viết prompt video AI cho phim điện ảnh chuyên nghiệp, tối ưu cho Jimeng.\n" +
"Nhiệm vụ của bạn là tạo ra các prompt video dựa trên các quy tắc nghiêm ngặt sau:\n\n" +
"1. Mục tiêu: Điện ảnh cao, hành động rõ ràng, nhân vật cameo ổn định, dễ ghép cảnh.\n" +
"2. Cấu trúc bắt đầu: Phải có 4 phần: Địa điểm, Thời gian, Thời tiết/Ánh sáng, và mô tả trang phục nhân vật.\n" +
"3. Định nghĩa nhân vật: Mọi nhân vật chính có tên riêng BẮT BUỘC phải được gán mã ID và đi kèm từ khóa cameo. Cấu trúc chuẩn: @1 = cameo 主角 (Tên), @2 = cameo 敌人 (Tên), @3 = cameo 女主角 (Tên). Sử dụng @4 trở đi cho nhân vật phụ/đàn em.\n" +
"4. Nhiều nhân vật: Liệt kê rõ @1, @2, @3...\n" +
"5. Chống trùng lặp: Mỗi nhân vật phải khác nhau, không clone.\n" +
"6. Tác động vật lý: Chỉ nhân vật bị đánh mới thay đổi vị trí/văng.\n" +
"7. Cảnh độc lập: Nhắc lại bối cảnh, thời gian, nhân vật vì AI không nhớ cảnh trước.\n" +
"8. Timeline: Chia timeline 12 giây (0-3s, 3-6s, 6-9s, 9-12s).\n" +
"9. Mạch hành động: Chỉ một mạch hành động chính mỗi prompt.\n" +
"10. Mô tả điện ảnh: Bao gồm camera angle, movement, ánh sáng, hiệu ứng vật lý (vỡ kính, tia lửa...).\n" +
"11. Mô tả võ thuật: Dùng thuật ngữ rõ ràng (spinning kick, flying kick...).\n" +
"12. Âm thanh: Thêm mô tả âm thanh (loud impact, glass shattering...).\n" +
"13. Thoại: Chỉ dùng tiếng Anh (ví dụ: @1 says in English: \"You finally came.\").\n" +
"14. Phụ đề: TUYỆT ĐỐI KHÔNG có phụ đề/text trên màn hình.\n" +
"15. Cảm xúc: Mô tả rõ trạng thái (shocked, terrified, furious...).\n" +
"16. Nhắc lại tình huống: Nhắc lại sự kiện đang diễn ra.\n" +
"17. Ngôn ngữ: Prompt chính viết bằng TIẾNG TRUNG. Thoại bên trong là TIẾNG ANH. TUYỆT ĐỐI KHÔNG kèm giải thích tiếng Anh hay ngôn ngữ khác. ĐẶC BIỆT: Khi có nhân vật CAMEO, BẮT BUỘC phải bao gồm cụm từ '保持Cameo原始服装' (Giữ nguyên trang phục cameo gốc) trong phần mô tả nhân vật ở chinesePrompt.\n" +
"18. Dịch thuật: Cung cấp bản dịch TIẾNG VIỆT đầy đủ 100%, sát nghĩa từng ý.\n" +
"19. LIÊN KẾT CẢNH (CINEMATIC CONTINUITY):\n" +
"    - Móc nối hành động (Action Bridge): 2 giây đầu của cảnh hiện tại phải tái hiện lại tư thế/vị trí kết thúc của cảnh trước đó (nhưng ở góc máy khác hoặc tiếp nối hành động).\n" +
"    - Chuyển đổi góc máy logic (Camera POV Switch): Nếu cảnh trước nhân vật bước qua ranh giới (cửa, cổng), cảnh sau phải đổi góc máy 180 độ (đón nhân vật).\n" +
"    - Kế thừa môi trường (Environment Persistence): Mọi thay đổi (kính vỡ, bàn ghế đổ) phải được duy trì trong suốt các cảnh sau tại cùng địa điểm.\n" +
"20. HÌNH ẢNH SẠCH & NHẤT QUÁN (CLEAN VISUALS):\n" +
"    - CẤM TUYỆT ĐỐI: Không sử dụng các từ liên quan đến máu (blood), vết xước (scars), vết thương (wounds), vết bầm (bruises).\n" +
"    - CẤM TUYỆT ĐỐI: Không mô tả chi tiết khuôn mặt như 'sạch sẽ', 'không mồ hôi', 'không bụi bẩn', 'tóc tai gọn gàng' (No facial descriptions like 'clean face', 'no sweat', 'neat hair') để tránh làm biến dạng gương mặt gốc của cameo.\n" +
"    - QUY TẮC PHONG TỎA CAMEO TOÀN DIỆN (FULL LOCK): Khi nhân vật là cameo (@1, @2, @3) và có chỉ định CAMEO OUTFIT:\n" +
"        + TỪ KHÓA MẶC ĐỊNH: 保持Cameo原始服装 (Keep original cameo outfit).\n" +
"        + ĐÓNG BĂNG TRANG PHỤC (Outfit Freeze): Tuyệt đối không thêm cà vạt (no tie), phụ kiện (no accessories), hoặc bất kỳ loại áo nào khác. Giữ nguyên màu sắc và kiểu dáng áo từ cameo gốc.\n" +
"    - THAY THẾ BẰNG HIỆU ỨNG NỖ LỰC (EFFORT EFFECTS): Chỉ sử dụng cho nhân vật PHỤ hoặc khi KHÔNG có phong tỏa cameo: \"Sweat on face\" (môi hôi), \"Messy hair\" (tóc rối), \"Heavy breathing\" (thở gấp), \"Dust on clothes\" (bụi bám áo) để thể hiện sự khốc liệt.\n" +
"21. QUY TẮC TRANG PHỤC THÔNG MINH (SMART OUTFIT):\n" +
"    - Nếu là nhân vật CAMEO (@1, @2, @3):\n" +
"        + Nam: giữ nguyên trang phục cameo gốc, còn ở dưới mặc black dress pants, black leather shoes (保持Cameo原始服装，下半身穿着黑色西装裤 và 黑色皮鞋).\n" +
"        + Nữ: giữ nguyên trang phục cameo gốc, còn ở dưới mặc black long trousers, black sandals (保持Cameo原始服装，下半身穿着黑色长裤 và 黑色拖鞋).\n" +
"        + TUYỆT ĐỐI KHÔNG mô tả áo (No shirt description).\n" +
"    - Nếu là nhân vật PHỤ (@4 trở đi): outfit fits the scene (服装符合场景).\n" +
"22. Hiển thị: Trả về kết quả gồm 2 phần: chinesePrompt (中文) và vietnameseTranslation.\n\n" +
"KHUNG PROMPT MẪU:\n" +
"【场景地点】 + 【时间】 + 【天气 / 光线 / 环境】.\n" +
"@1 = cameo 主角 (Tên thật)\n" +
"@2 = cameo 敌人 (Tên thật)\n" +
"@3 = cameo 女主角 (Tên thật)\n" +
"@4 = 额外角色 (Tên thật)\n" +
"保持 cameo 服装不变，只描述下半身 (黑色西装裤/长裤 và 黑色皮鞋/拖鞋)，不允许描述上衣...\n" +
"0–3 秒: (Nếu là cảnh tiếp nối, bắt đầu bằng việc kế thừa hành động từ cảnh trước)...\n" +
"3–6 秒: ...\n" +
"6–9 秒: ...\n" +
"9–12 秒: ...\n" +
"电影级镜头运动...";

export const suggestIdeas = async (): Promise<IdeaSuggestion[]> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Đề xuất 5 chủ đề phim hành động đang hot trend (Võ thuật đường phố, Trả thù, Đặc nhiệm...). Mỗi chủ đề gồm tiêu đề và mô tả ngắn." }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateScreenplay = async (idea: string, numEpisodes: number, durationPerEpisode: number): Promise<Screenplay> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Dựa trên ý tưởng: \"" + idea + "\", hãy viết kịch bản tổng thể cho bộ phim gồm " + numEpisodes + " tập. Tóm tắt nội dung chi tiết cho từng tập." }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallPlot: { type: Type.STRING },
          episodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["id", "title", "summary"]
            }
          }
        },
        required: ["overallPlot", "episodes"]
      }
    }
  });
  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    episodes: data.episodes.map((ep: any) => ({ 
      ...ep, 
      duration: durationPerEpisode, 
      scenes: [] 
    }))
  };
};

export const breakdownScenes = async (episodeSummary: string, numScenes: number, previousContext: string, intensityLevel: 'storytelling' | 'action-drama' | 'hardcore'): Promise<Scene[]> => {
  const ai = getAiClient();
  
  const intensityInstructions = {
    'storytelling': "\nCẤP ĐỘ: NHỊP BÌNH THƯỜNG (STORYTELLING)\n- Phong cách: Tâm lý xã hội, có chiều sâu, ít đánh nhau.\n- Tỉ lệ cảnh hành động: ~20%.\n- Tập trung vào: Đối thoại, bối cảnh, cảm xúc nhân vật.\n- Nhịp độ: Chậm, sâu sắc.\n",
    'action-drama': "\nCẤP ĐỘ: KỊCH TÍNH VỪA PHẢI (ACTION-DRAMA)\n- Phong cách: Hành động điều tra, hình sự.\n- Tỉ lệ cảnh hành động: ~50%.\n- Tập trung vào: Rượt đuổi ngắn, xô xát, căng thẳng tăng dần.\n- Nhịp độ: Trung bình, bùng nổ cuối tập.\n",
    'hardcore': "\nCẤP ĐỘ: ĐỘC CHIẾN LIÊN HOÀN (HARDCORE ACTION)\n- Phong cách: Đánh nhau liên tục từ đầu đến cuối.\n- Tỉ lệ cảnh hành động: 90% - 100%.\n- Tập trung vào: Va chạm vật lý mạnh, chiến đấu tốc độ cao, liên hoàn đòn.\n- Nhịp độ: Cực nhanh, dồn dập.\n"
  };

  const prompt = "Dựa trên tóm tắt tập phim hiện tại: \"" + episodeSummary + "\"\n" +
    "Và bối cảnh từ tập trước (nếu có): \"" + previousContext + "\"\n\n" +
    intensityInstructions[intensityLevel] + "\n" +
    "Hãy chia thành " + numScenes + " cảnh quay chi tiết (mỗi cảnh tương ứng 12 giây).\n\n" +
    "QUY TẮC LIÊN KẾT CẢNH (CINEMATIC CONTINUITY):\n" +
    "1. Móc nối hành động (Action Bridge): Cảnh N kết thúc ở tư thế/vị trí nào, thì Cảnh N+1 phải bắt đầu bằng việc tái hiện lại tư thế đó (trong 2 giây đầu) trước khi tiếp tục hành động mới.\n" +
    "2. Chuyển đổi góc máy logic (Camera POV Switch): Nếu Cảnh N nhân vật bước qua ranh giới (cửa, cổng), Cảnh N+1 phải đổi góc máy 180 độ (từ phía đối diện) để đón nhân vật.\n" +
    "3. Kế thừa môi trường (Environment Persistence): Mọi sự thay đổi về môi trường (kính vỡ, bàn ghế đổ, cửa mở) phải được ghi nhận và duy trì trong mô tả bối cảnh của tất cả các cảnh kế tiếp trong cùng một địa điểm.\n\n" +
    "YÊU CẦU QUAN TRỌNG CHO MỖI CẢNH:\n" +
    "1. Phải nhắc lại đầy đủ: Địa điểm, Thời gian, Thời tiết/Ánh sáng, Trang phục nhân vật, và Bối cảnh tình huống đang diễn ra.\n" +
    "2. SỬ DỤNG ĐỊNH DANH NHÂN VẬT (Ví dụ: \"@1 (Lê Tuấn)\", \"@2 (Sato)\", \"@3 (Tuyết Mai)\"). Phải có ký hiệu @ và số thứ tự trước tên nhân vật trong ngoặc đơn để hệ thống quản trị nhân vật có thể nhận diện.\n" +
    "3. Đảm bảo tính xuyên suốt và logic với tập trước.\n" +
    "4. Mỗi mô tả cảnh phải là một đoạn văn hoàn chỉnh chứa đầy đủ thông tin bối cảnh để có thể viết prompt độc lập.\n" +
    "5. Dựa theo cấp độ nhịp phim đã chọn ở trên để viết mô tả hành động phù hợp.\n" +
    "6. ĐẶC BIỆT: Mô tả rõ điểm kết thúc của cảnh trước để cảnh sau có thể \"móc nối\" hành động một cách mượt mà.\n";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING }
          },
          required: ["description"]
        }
      }
    }
  });
  const scenes = JSON.parse(response.text || "[]");
  return scenes.map((s: any, index: number) => ({
    id: "scene-" + Date.now() + "-" + index,
    description: s.description,
    characters: []
  }));
};

export const generateFinalPrompt = async (
  sceneDescription: string, 
  context: string, // Layer 1: Global Story / Episode Context
  characters: Character[], 
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore', 
  previousSceneDescription?: string, // Layer 3: Action Bridge
  previousTechnicalPrompt?: string, // Layer 3: Technical Inheritance (Jimeng/Veo DNA)
  isLateScene?: boolean
): Promise<CinematicPrompt> => {
  const ai = getAiClient();
  
  const intensityKeywords = {
    'storytelling': "Static camera, Slow movement, Dialogue scene, Emotional facial expressions",
    'action-drama': "Dynamic camera, Fast walking, Intense eye contact, Short combat sequences",
    'hardcore': "High-speed combat, Non-stop fighting, Extreme physical impact, Handheld camera shake, Blood and sweat details"
  };

  const hasCameoOn = characters.some(c => c.useCameoOutfit);
  let effortEffects = "Heavy breathing"; // Always safe
  if (!hasCameoOn) {
    effortEffects += ", Messy hair, Dust on clothes";
    if (isLateScene) {
      effortEffects += ", Sweat on face";
    }
  } else {
    // If there's a cameo, we only add dust/sweat to the scene if we explicitly target non-cameo characters, 
    // but for simplicity and safety of the cameo face, we'll be conservative here.
    effortEffects += ", Cinematic lighting"; 
  }

  let characterInstructions = "";
  if (characters && characters.length > 0) {
    characterInstructions = "DANH SÁCH NHÂN VẬT VÀ QUY TẮC TRANG PHỤC (QUY TẮC TAM GIÁC VÀNG - TỐI ĐA 3 NHÂN VẬT CHÍNH):\n";
    
    const sortedCharacters = [...characters].sort((a, b) => {
      if (a.isMain === b.isMain) return 0;
      return a.isMain ? -1 : 1;
    });

    const mainCharacters = sortedCharacters.filter(c => c.isMain);
    const supportingCharacters = sortedCharacters.filter(c => !c.isMain);
    
    const topMain = mainCharacters.slice(0, 3);
    const otherMain = mainCharacters.slice(3);

    topMain.forEach((char, index) => {
      const symbol = "@" + (index + 1);
      let role = "主角";
      if (index === 1) role = "敌人";
      if (index === 2) role = char.gender === 'female' ? "女主角" : "伙伴";

      if (char.useCameoOutfit) {
        const outfit = char.gender === 'male' 
          ? "giữ nguyên trang phục cameo gốc, còn ở dưới mặc black dress pants, black leather shoes (保持Cameo原始服装，下半身穿着黑色西装裤 và 黑色皮鞋)" 
          : "giữ nguyên trang phục cameo gốc, còn ở dưới mặc black long trousers, black sandals (保持Cameo原始服装，下半身穿着黑色长裤 và 黑色拖鞋)";
        characterInstructions += "- " + symbol + " = cameo " + role + " (" + char.name + "): [FULL LOCK ON] TRANG PHỤC: " + outfit + ". (Lưu ý: TUYỆT ĐỐI KHÔNG cà vạt, phụ kiện. Chỉ mô tả phần dưới, KHÔNG nhắc tới áo trong chinesePrompt).\n";
      } else {
        characterInstructions += "- " + symbol + " (" + char.name + "): NHÂN VẬT CHÍNH (CAMEO OFF). TRANG PHỤC: Tự do phù hợp bối cảnh.\n";
      }
    });

    otherMain.forEach((char, index) => {
      const symbol = "@" + (topMain.length + index + 1);
      if (char.useCameoOutfit) {
        characterInstructions += "- " + symbol + " (" + char.name + "): NHÂN VẬT CHÍNH (CAMEO ON - NGOÀI KHUNG HÌNH). Do vượt quá hạn mức 3 người chính, nhân vật này phải ở ngoài khung hình (off-screen) hoặc làm mờ (blurred) hoặc quay lưng về phía máy quay.\n";
      } else {
        characterInstructions += "- " + symbol + " (" + char.name + "): NHÂN VẬT CHÍNH (CAMEO OFF). TRANG PHỤC: Tự do phù hợp bối cảnh (outfit fits the scene).\n";
      }
    });

    supportingCharacters.forEach((char, index) => {
      const symbol = "@" + (mainCharacters.length + index + 1);
      characterInstructions += "- " + symbol + " (" + char.name + "): NHÂN VẬT PHỤ. TRANG PHỤC: Tự do phù hợp bối cảnh (outfit fits the scene).\n";
    });
  } else {
    characterInstructions = "Hãy tự xác định các nhân vật và trang phục phù hợp.";
  }

  const layer1 = "LỚP 1: BỐI CẢNH TỔNG QUAN (GLOBAL STORY)\n" + context + "\n";
  const layer2 = "LỚP 2: DIỄN BIẾN PHÂN CẢNH (SCENE FLOW)\n" + sceneDescription + "\n";
  
  let layer3 = "LỚP 3: KẾ THỪA KỸ THUẬT (TECHNICAL INHERITANCE)\n";
  if (previousTechnicalPrompt) {
    layer3 += "TRUY XUẤT TỪ PROMPT TRƯỚC: \"" + previousTechnicalPrompt + "\"\n" +
              "HÃY TRÍCH XUẤT 'MÃ GEN' KỸ THUẬT (Ánh sáng, Vị trí vật lý, Tình trạng môi trường) VÀ SAO CHÉP VÀO PROMPT MỚI ĐỂ ĐẢM BẢO ĐỒNG NHẤT 100%.\n";
  }
  if (previousSceneDescription) {
    layer3 += "MÓC NỐI HÀNH ĐỘNG: Cảnh trước kết thúc tại \"" + previousSceneDescription + "\". Đảm bảo 2 giây đầu tái hiện lại tư thế này.\n";
  }

  const promptText = "HÃY THỰC HIỆN QUY TRÌNH 3 LỚP ĐỂ TẠO PROMPT VIDEO AI:\n\n" +
    layer1 + "\n" +
    layer2 + "\n" +
    layer3 + "\n" +
    "Cấp độ nhịp phim: " + intensityLevel.toUpperCase() + ". \n" +
    "Từ khóa bắt buộc sử dụng: " + intensityKeywords[intensityLevel] + ", " + effortEffects + ".\n\n" +
    characterInstructions + "\n\n" +
    "Hãy gán @1, @2... cho các nhân vật tương ứng trong danh sách trên theo đúng quy tắc 19 bước. \n" +
    "QUY TẮC KHÓA TÊN RIÊNG (STRICT NAME MAPPING): BẮT BUỘC phải ghi tên thật của nhân vật trong ngoặc đơn ngay sau vai trò cameo (Ví dụ: @1 = cameo 主角 (Lê Tuấn)). TUYỆT ĐỐI không được để trống tên hoặc chỉ gọi tên chung chung.\n" +
    "LƯU Ý QUAN TRỌNG: Phần chinesePrompt CHỈ chứa mô tả hình ảnh điện ảnh bằng tiếng Trung. BẮT BUỘC phải bao gồm mô tả 'giữ nguyên trang phục cameo gốc' (保持Cameo原始服装) cho các nhân vật có [FULL LOCK ON] trong kết quả cuối cùng.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      systemInstruction: RULE_19_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chinesePrompt: { type: Type.STRING },
          vietnameseTranslation: { type: Type.STRING }
        },
        required: ["chinesePrompt", "vietnameseTranslation"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
